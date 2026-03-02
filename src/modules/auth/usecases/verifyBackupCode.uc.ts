import { Usecase } from '@broker/types';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Response } from 'express';
import * as crypto from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { MfaBackupVerifyDto } from '../dto/mfaBackupVerify.dto';
import { MfaService } from '../services/mfa.service';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { AuditService } from '../services/audit.service';
import { RefreshTokenRepository } from '@adapters/repositories/refreshToken.repository';
import { MfaConfigRepository } from '@adapters/repositories/mfaConfig.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { AuthEventType } from '../../core/entities/authAuditLog.entity';

@Injectable()
export class VerifyBackupCodeUsecase extends Usecase<{ staffId: string }> {
  private readonly logger = new Logger(VerifyBackupCodeUsecase.name);

  constructor(
    private readonly mfaService: MfaService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly mfaConfigRepository: MfaConfigRepository,
    private readonly staffRepository: StaffRepository,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    params: MfaBackupVerifyDto & {
      res: Response;
      ipAddress?: string;
      userAgent?: string;
      mfaStaffId: string;
    },
  ): Promise<{ staffId: string }> {
    const { mfaStaffId, backupCode, res, ipAddress, userAgent } = params;

    const staff = await this.staffRepository.findOne({
      where: { id: mfaStaffId },
      relations: ['role'],
    });
    if (!staff) throw new UnauthorizedException('Staff not found');

    const mfaConfig = await this.mfaConfigRepository.findByStaffId(mfaStaffId);
    if (!mfaConfig || !mfaConfig.backupCodeHashes) {
      throw new UnauthorizedException('Backup codes not configured');
    }

    const hashedCodes: string[] = JSON.parse(mfaConfig.backupCodeHashes);
    const usedIndexes: number[] = mfaConfig.usedBackupCodes
      ? JSON.parse(mfaConfig.usedBackupCodes)
      : [];

    const matchIndex = await this.mfaService.verifyBackupCode(backupCode, hashedCodes);
    if (matchIndex === -1 || usedIndexes.includes(matchIndex)) {
      await this.auditService.log({
        staffId: mfaStaffId,
        event: AuthEventType.MFA_FAILED,
        ipAddress,
        userAgent,
        metadata: { reason: 'invalid_backup_code' },
        success: false,
      });
      throw new UnauthorizedException('Invalid or already used backup code');
    }

    // Mark backup code as used
    usedIndexes.push(matchIndex);
    await this.mfaConfigRepository.saveOrUpdate(mfaStaffId, {
      usedBackupCodes: JSON.stringify(usedIndexes),
    });

    // Enforce session limit and issue tokens
    await this.sessionService.enforceSessionLimit(mfaStaffId);

    const jti = this.tokenService.generateJti();
    const accessToken = this.tokenService.signAccessToken({
      sub: mfaStaffId,
      jti,
      role: staff.role?.alias ?? '',
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
    await this.staffRepository.update(mfaStaffId, { lastLogin: new Date() });

    await this.auditService.log({
      staffId: mfaStaffId,
      event: AuthEventType.MFA_BACKUP_USED,
      ipAddress,
      userAgent,
    });

    return { staffId: mfaStaffId };
  }
}
