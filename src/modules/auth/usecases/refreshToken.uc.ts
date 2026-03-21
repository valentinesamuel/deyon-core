import { Usecase } from '@broker/types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { EventLogService } from '../services/eventLog.service';
import { RefreshTokenRepository } from '@adapters/repositories/refreshToken.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RedisKeys } from '@adapters/cache/cache.constants';
import { EventModule, EventType } from '../../core/entities/eventLog.entity';
import { RequestContextService } from '@shared/context/requestContext.service';

export interface RefreshTokenResult {
  accessToken: string;
  newRefreshToken: string;
}

@Injectable()
export class RefreshTokenUsecase extends Usecase<RefreshTokenResult> {
  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly eventLogService: EventLogService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly staffRepository: StaffRepository,
    private readonly cacheAdapter: CacheAdapter,
    private readonly configService: ConfigService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: { refreshToken: string }): Promise<RefreshTokenResult> {
    const { refreshToken: opaqueToken } = params;
    const ipAddress = this.requestContextService.getIp() ?? undefined;
    const userAgent = this.requestContextService.getUserAgent() ?? undefined;

    if (!opaqueToken) throw new UnauthorizedException('No refresh token provided');

    const tokenHash = this.tokenService.sha256(opaqueToken);
    const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash, em);

    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    // Theft detection: token was already revoked
    if (stored.isRevoked) {
      await this.sessionService.revokeFamily(stored.staffId, stored.familyId);
      await this.eventLogService.log(
        {
          actorId: stored.staffId,
          event: EventType.TOKEN_THEFT_DETECTED,
          module: EventModule.AUTH,
          ipAddress,
          userAgent,
          success: false,
        },
        em,
      );
      throw new UnauthorizedException('Token reuse detected — all sessions terminated');
    }

    if (stored.expiresAt < new Date()) {
      await this.refreshTokenRepository.revokeToken(tokenHash, em);
      throw new UnauthorizedException('Refresh token expired');
    }

    const staff = await this.staffRepository.findOne({
      where: { id: stored.staffId },
      relations: ['role'],
    });
    if (!staff || !staff.isActive || !staff.isApproved) {
      throw new UnauthorizedException('Account is not active');
    }

    // Rotate: revoke old token, issue new pair
    await this.refreshTokenRepository.revokeToken(tokenHash, em);

    const newJti = this.tokenService.generateJti();
    const newAccessToken = this.tokenService.signAccessToken({
      sub: staff.id,
      jti: newJti,
      role: staff.role?.alias ?? '',
    });

    const newOpaqueToken = this.tokenService.generateOpaqueToken();
    const newTokenHash = this.tokenService.sha256(newOpaqueToken);
    const refreshExpiry = this.configService.get<number>('common.jwt.refreshExpiry')!;

    await this.refreshTokenRepository.createToken(
      {
        tokenHash: newTokenHash,
        staffId: staff.id,
        familyId: stored.familyId,
        expiresAt: new Date(Date.now() + refreshExpiry * 1000),
        userAgent,
        ipAddress,
      },
      em,
    );

    // Invalidate profile cache to pick up any role changes
    await this.cacheAdapter.del(RedisKeys.profile(staff.id), { db: CacheDbType.AUTH });

    await this.eventLogService.log(
      {
        actorId: staff.id,
        event: EventType.TOKEN_REFRESHED,
        module: EventModule.AUTH,
        ipAddress,
        userAgent,
      },
      em,
    );

    return { accessToken: newAccessToken, newRefreshToken: newOpaqueToken };
  }
}
