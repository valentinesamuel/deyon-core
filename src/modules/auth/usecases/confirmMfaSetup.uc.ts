import { Usecase } from '@broker/types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import * as crypto from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { MfaSetupConfirmDto } from '../dto/mfaSetupConfirm.dto';
import { MfaService } from '../services/mfa.service';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { EventLogService } from '../services/eventLog.service';
import { MfaConfigRepository } from '@adapters/repositories/mfaConfig.repository';
import { RefreshTokenRepository } from '@adapters/repositories/refreshToken.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RedisKeys } from '@adapters/cache/cache.constants';
import { EventModule, EventType } from '../../core/entities/eventLog.entity';
import { RequestContextService } from '@shared/context/requestContext.service';

export interface ConfirmMfaSetupResult {
  accessGranted: boolean;
  backupCodes: string[];
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class ConfirmMfaSetupUsecase extends Usecase<ConfirmMfaSetupResult> {
  constructor(
    private readonly mfaService: MfaService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly eventLogService: EventLogService,
    private readonly mfaConfigRepository: MfaConfigRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly staffRepository: StaffRepository,
    private readonly cacheAdapter: CacheAdapter,
    private readonly configService: ConfigService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: MfaSetupConfirmDto): Promise<ConfirmMfaSetupResult> {
    const { totpCode, setupToken } = params;
    const mfaStaffId = this.requestContextService.getUserId();
    const ipAddress = this.requestContextService.getIp() ?? undefined;
    const userAgent = this.requestContextService.getUserAgent() ?? undefined;

    const mfaConfig = await this.mfaConfigRepository.findByStaffId(mfaStaffId, em);
    if (!mfaConfig) throw new UnauthorizedException('MFA setup not initiated');

    const valid = await this.mfaService.verifyTotp(mfaConfig.encryptedSecret, totpCode);
    if (!valid) throw new UnauthorizedException('Invalid TOTP code');

    // Generate and store backup codes
    const { plainCodes, hashedCodes } = await this.mfaService.generateBackupCodes();
    await this.mfaConfigRepository.saveOrUpdate(
      mfaStaffId,
      {
        backupCodeHashes: JSON.stringify(hashedCodes),
        usedBackupCodes: JSON.stringify([]),
      },
      em,
    );

    // Mark MFA as enabled for staff
    await this.staffRepository.update(mfaStaffId, { mfaEnabled: true });

    // Consume setup token
    const setupTokenKey = RedisKeys.mfaSetup(setupToken);
    await this.cacheAdapter.del(setupTokenKey, { db: CacheDbType.AUTH });

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
    const refreshExpiry = this.configService.get<number>('common.jwt.refreshExpiry')!;

    await this.refreshTokenRepository.createToken(
      {
        tokenHash,
        staffId: mfaStaffId,
        familyId,
        expiresAt: new Date(Date.now() + refreshExpiry * 1000),
        userAgent,
        ipAddress,
      },
      em,
    );

    await this.sessionService.addSession(mfaStaffId, familyId);

    await this.eventLogService.log(
      {
        actorId: mfaStaffId,
        event: EventType.MFA_SETUP,
        module: EventModule.AUTH,
        ipAddress,
        userAgent,
      },
      em,
    );

    // Return backup codes (only shown once)
    return { accessGranted: true, backupCodes: plainCodes, accessToken, refreshToken: opaqueToken };
  }
}
