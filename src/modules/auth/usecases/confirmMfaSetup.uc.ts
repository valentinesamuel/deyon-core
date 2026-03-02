import { Usecase } from '@broker/types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Response } from 'express';
import * as crypto from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { MfaSetupConfirmDto } from '../dto/mfaSetupConfirm.dto';
import { MfaService } from '../services/mfa.service';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { AuditService } from '../services/audit.service';
import { MfaConfigRepository } from '@adapters/repositories/mfaConfig.repository';
import { RefreshTokenRepository } from '@adapters/repositories/refreshToken.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { RedisService } from '@shared/redis/redis.service';
import { RedisKeys } from '@shared/redis/redis.constants';
import { AuthEventType } from '../../core/entities/authAuditLog.entity';

@Injectable()
export class ConfirmMfaSetupUsecase extends Usecase<{ accessGranted: boolean }> {
  constructor(
    private readonly mfaService: MfaService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    private readonly mfaConfigRepository: MfaConfigRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly staffRepository: StaffRepository,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    params: MfaSetupConfirmDto & {
      res: Response;
      mfaStaffId: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<{ accessGranted: boolean }> {
    const { mfaStaffId, totpCode, res, ipAddress, userAgent } = params;

    const mfaConfig = await this.mfaConfigRepository.findByStaffId(mfaStaffId);
    if (!mfaConfig) throw new UnauthorizedException('MFA setup not initiated');

    const valid = await this.mfaService.verifyTotp(mfaConfig.encryptedSecret, totpCode);
    if (!valid) throw new UnauthorizedException('Invalid TOTP code');

    // Generate and store backup codes
    const { plainCodes, hashedCodes } = await this.mfaService.generateBackupCodes();
    await this.mfaConfigRepository.saveOrUpdate(mfaStaffId, {
      backupCodeHashes: JSON.stringify(hashedCodes),
      usedBackupCodes: JSON.stringify([]),
    });

    // Mark MFA as enabled for staff
    await this.staffRepository.update(mfaStaffId, { mfaEnabled: true });

    // Consume setup token
    const setupTokenKey = RedisKeys.mfaSetup(params.setupToken);
    await this.redisService.del(setupTokenKey);

    // Issue auth tokens
    const staff = await this.staffRepository.findOne({
      where: { id: mfaStaffId },
      relations: ['role'],
    });

    const jti = this.tokenService.generateJti();
    const accessToken = this.tokenService.signAccessToken({
      sub: mfaStaffId,
      jti,
      role: staff?.role?.alias ?? '',
    });

    const opaqueToken = this.tokenService.generateOpaqueToken();
    const tokenHash = this.tokenService.sha256(opaqueToken);
    const familyId = crypto.randomUUID();
    const refreshExpiry = this.configService.get<number>('common.jwt.refreshExpiry');

    await this.refreshTokenRepository.createToken({
      tokenHash,
      staffId: mfaStaffId,
      familyId,
      expiresAt: new Date(Date.now() + refreshExpiry * 1000),
      userAgent,
      ipAddress,
    });

    await this.sessionService.addSession(mfaStaffId, familyId);
    this.tokenService.setAuthCookies(res, accessToken, opaqueToken);

    await this.auditService.log({
      staffId: mfaStaffId,
      event: AuthEventType.MFA_SETUP,
      ipAddress,
      userAgent,
    });

    // Return backup codes (only shown once)
    return { accessGranted: true, backupCodes: plainCodes } as any;
  }
}
