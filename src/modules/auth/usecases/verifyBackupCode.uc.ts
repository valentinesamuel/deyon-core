import { Usecase } from '@broker/types';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import * as crypto from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { MfaBackupVerifyDto } from '../dto/mfaBackupVerify.dto';
import { MfaService } from '../services/mfa.service';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { EventLogService } from '../services/eventLog.service';
import { RefreshTokenRepository } from '@adapters/repositories/refreshToken.repository';
import { MfaConfigRepository } from '@adapters/repositories/mfaConfig.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { EventModule, EventType } from '../../core/entities/eventLog.entity';
import { RequestContextService } from '@shared/context/requestContext.service';

export interface VerifyBackupCodeResult {
  accessToken: string;
  refreshToken: string;
  staffId: string;
}

@Injectable()
export class VerifyBackupCodeUsecase extends Usecase<VerifyBackupCodeResult> {
  private readonly logger = new Logger(VerifyBackupCodeUsecase.name);

  constructor(
    private readonly mfaService: MfaService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly eventLogService: EventLogService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly mfaConfigRepository: MfaConfigRepository,
    private readonly staffRepository: StaffRepository,
    private readonly configService: ConfigService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: MfaBackupVerifyDto): Promise<VerifyBackupCodeResult> {
    const { backupCode } = params;
    const mfaStaffId = this.requestContextService.getUserId();
    const ipAddress = this.requestContextService.getIp() ?? undefined;
    const userAgent = this.requestContextService.getUserAgent() ?? undefined;

    const staff = await this.staffRepository.findOne({
      where: { id: mfaStaffId },
      relations: ['role'],
    });
    if (!staff) throw new UnauthorizedException('Staff not found');

    const mfaConfig = await this.mfaConfigRepository.findByStaffId(mfaStaffId, em);
    if (!mfaConfig?.backupCodeHashes) {
      throw new UnauthorizedException('Backup codes not configured');
    }

    const hashedCodes: string[] = JSON.parse(mfaConfig.backupCodeHashes);
    const usedIndexes: number[] = mfaConfig.usedBackupCodes
      ? JSON.parse(mfaConfig.usedBackupCodes)
      : [];

    const matchIndex = await this.mfaService.verifyBackupCode(backupCode, hashedCodes);
    if (matchIndex === -1 || usedIndexes.includes(matchIndex)) {
      await this.eventLogService.log(
        {
          actorId: mfaStaffId,
          event: EventType.MFA_FAILED,
          module: EventModule.AUTH,
          ipAddress,
          userAgent,
          metadata: { reason: 'invalid_backup_code' },
          success: false,
        },
        em,
      );
      throw new UnauthorizedException('Invalid or already used backup code');
    }

    // Mark backup code as used
    usedIndexes.push(matchIndex);
    await this.mfaConfigRepository.saveOrUpdate(
      mfaStaffId,
      {
        usedBackupCodes: JSON.stringify(usedIndexes),
      },
      em,
    );

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
    await this.staffRepository.update(mfaStaffId, { lastLogin: new Date() });

    await this.eventLogService.log(
      {
        actorId: mfaStaffId,
        event: EventType.MFA_BACKUP_USED,
        module: EventModule.AUTH,
        ipAddress,
        userAgent,
      },
      em,
    );

    return { accessToken, refreshToken: opaqueToken, staffId: mfaStaffId };
  }
}
