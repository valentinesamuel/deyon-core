import { Usecase } from '@broker/types';
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { EventLogService } from '../services/eventLog.service';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RedisKeys } from '@adapters/cache/cache.constants';
import { EventModule, EventType } from '../../core/entities/eventLog.entity';
import { RequestContextService } from '@shared/context/requestContext.service';

@Injectable()
export class LogoutAllUsecase extends Usecase<{ loggedOut: boolean }> {
  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly eventLogService: EventLogService,
    private readonly cacheAdapter: CacheAdapter,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: { accessToken: string },
  ): Promise<{ loggedOut: boolean }> {
    const staffId = this.requestContextService.getUserId();
    const { accessToken } = params;
    const ipAddress = this.requestContextService.getIp() ?? undefined;
    const userAgent = this.requestContextService.getUserAgent() ?? undefined;

    // Blocklist current access token
    if (accessToken) {
      const payload = this.tokenService.verifyAccessToken(accessToken);
      if (payload) {
        const remainingTtl = payload['exp'] ? payload['exp'] - Math.floor(Date.now() / 1000) : 900;
        if (remainingTtl > 0) {
          await this.cacheAdapter.set(RedisKeys.jtiBlocklist(payload.jti), '1', {
            db: CacheDbType.AUTH,
            ttl: remainingTtl,
          });
        }
      }
    }

    // Revoke all sessions
    await this.sessionService.revokeAllSessions(staffId);

    // Invalidate profile cache
    await this.cacheAdapter.del(RedisKeys.profile(staffId), { db: CacheDbType.AUTH });

    await this.eventLogService.log(
      {
        actorId: staffId,
        event: EventType.LOGOUT_ALL,
        module: EventModule.AUTH,
        ipAddress,
        userAgent,
      },
      em,
    );

    return { loggedOut: true };
  }
}
