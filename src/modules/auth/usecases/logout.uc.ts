import { Usecase } from '@broker/types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { EventLogService } from '../services/eventLog.service';
import { RefreshTokenRepository } from '@adapters/repositories/refreshToken.repository';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RedisKeys } from '@adapters/cache/cache.constants';
import { EventModule, EventType } from '../../core/entities/eventLog.entity';
import { RequestContextService } from '@shared/context/requestContext.service';

@Injectable()
export class LogoutUsecase extends Usecase<{ loggedOut: boolean }> {
  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly eventLogService: EventLogService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly cacheAdapter: CacheAdapter,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: { accessToken: string; refreshToken: string },
  ): Promise<{ loggedOut: boolean }> {
    const { accessToken, refreshToken } = params;
    const ipAddress = this.requestContextService.getIp() ?? undefined;
    const userAgent = this.requestContextService.getUserAgent() ?? undefined;

    let staffId: string | undefined;

    // Blocklist the JWT jti
    if (accessToken) {
      const payload = this.tokenService.verifyAccessToken(accessToken);
      if (payload) {
        staffId = payload.sub;
        // TTL = remaining lifetime of token
        const remainingTtl = payload['exp'] ? payload['exp'] - Math.floor(Date.now() / 1000) : 900;
        if (remainingTtl > 0) {
          await this.cacheAdapter.set(RedisKeys.jtiBlocklist(payload.jti), '1', {
            db: CacheDbType.AUTH,
            ttl: remainingTtl,
          });
        }
      }
    }

    // Revoke refresh token
    if (refreshToken) {
      const tokenHash = this.tokenService.sha256(refreshToken);
      const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash, em);
      if (stored) {
        staffId = staffId ?? stored.staffId;
        await this.refreshTokenRepository.revokeToken(tokenHash, em);
        await this.sessionService.removeSession(stored.staffId, stored.familyId);
      }
    }

    if (!staffId) throw new UnauthorizedException('No active session found');

    await this.eventLogService.log(
      {
        actorId: staffId,
        event: EventType.LOGOUT,
        module: EventModule.AUTH,
        ipAddress,
        userAgent,
      },
      em,
    );

    return { loggedOut: true };
  }
}
