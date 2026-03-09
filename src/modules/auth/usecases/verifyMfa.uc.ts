import { Usecase } from '@broker/types';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Response } from 'express';
import { MfaVerifyDto } from '../dto/mfaVerify.dto';
import { MfaService } from '../services/mfa.service';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { EventLogService } from '../services/eventLog.service';
import { RefreshTokenRepository } from '@adapters/repositories/refreshToken.repository';
import { MfaConfigRepository } from '@adapters/repositories/mfaConfig.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { RedisService } from '@shared/redis/redis.service';
import { RedisKeys, RedisTTL } from '@shared/redis/redis.constants';
import { EventModule, EventType } from '../../core/entities/eventLog.entity';
import * as crypto from 'node:crypto';
import { ConfigService } from '@nestjs/config';

export interface VerifyMfaResult {
  staffId: string;
  role: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class VerifyMfaUsecase extends Usecase<VerifyMfaResult> {
  private readonly logger = new Logger(VerifyMfaUsecase.name);

  constructor(
    private readonly mfaService: MfaService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly eventLogService: EventLogService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly mfaConfigRepository: MfaConfigRepository,
    private readonly staffRepository: StaffRepository,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    params: MfaVerifyDto & {
      res: Response;
      ipAddress?: string;
      userAgent?: string;
      mfaStaffId: string;
    },
  ): Promise<VerifyMfaResult> {
    const { mfaStaffId, totpCode, res, ipAddress, userAgent } = params;

    // 1. Load staff
    const staff = await this.staffRepository.findOne({
      where: { id: mfaStaffId },
      relations: ['role'],
    });

    if (!staff) throw new UnauthorizedException('Staff not found');

    // 2. Load MFA config
    const mfaConfig = await this.mfaConfigRepository.findByStaffId(mfaStaffId);
    if (!mfaConfig) throw new UnauthorizedException('MFA not configured');

    // 3. Anti-replay check
    const antiReplayKey = RedisKeys.totpUsed(mfaStaffId, totpCode);
    const alreadyUsed = await this.redisService.exists(antiReplayKey);
    if (alreadyUsed) {
      throw new UnauthorizedException('TOTP code already used');
    }

    // 4. Verify TOTP
    const valid = await this.mfaService.verifyTotp(mfaConfig.encryptedSecret, totpCode);
    if (!valid) {
      await this.eventLogService.log({
        actorId: mfaStaffId,
        event: EventType.MFA_FAILED,
        module: EventModule.AUTH,
        ipAddress,
        userAgent,
        success: false,
      });
      throw new UnauthorizedException('Invalid TOTP code');
    }

    // 5. Mark code as used (anti-replay)
    await this.redisService.set(antiReplayKey, '1', RedisTTL.totpAntiReplay);

    // 6. Enforce session limit
    await this.sessionService.enforceSessionLimit(mfaStaffId);

    // 7. Issue tokens
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

    // 8. Set cookies
    this.tokenService.setAuthCookies(res, accessToken, opaqueToken);

    // 9. Update lastLogin
    await this.staffRepository.update(mfaStaffId, { lastLogin: new Date() });

    await this.eventLogService.log({
      actorId: mfaStaffId,
      event: EventType.MFA_VERIFIED,
      module: EventModule.AUTH,
      ipAddress,
      userAgent,
    });

    return {
      staffId: mfaStaffId,
      role: staff.role?.alias ?? '',
      firstName: staff.firstName,
      lastName: staff.lastName,
    };
  }
}
