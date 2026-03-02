import { Usecase } from '@broker/types';
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Request, Response } from 'express';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { AuditService } from '../services/audit.service';
import { RedisService } from '@shared/redis/redis.service';
import { RedisKeys } from '@shared/redis/redis.constants';
import { AuthEventType } from '../../core/entities/authAuditLog.entity';

@Injectable()
export class LogoutAllUsecase extends Usecase<{ loggedOut: boolean }> {
  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    params: {
      req: Request;
      res: Response;
      staffId: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<{ loggedOut: boolean }> {
    const { res, staffId, ipAddress, userAgent } = params;

    // Blocklist current access token
    const accessToken = params.req?.cookies?.access_token;
    if (accessToken) {
      const payload = this.tokenService.verifyAccessToken(accessToken);
      if (payload) {
        const remainingTtl = payload['exp'] ? payload['exp'] - Math.floor(Date.now() / 1000) : 900;
        if (remainingTtl > 0) {
          await this.redisService.set(RedisKeys.jtiBlocklist(payload.jti), '1', remainingTtl);
        }
      }
    }

    // Revoke all sessions
    await this.sessionService.revokeAllSessions(staffId);

    // Invalidate profile cache
    await this.redisService.del(RedisKeys.profile(staffId));

    this.tokenService.clearAuthCookies(res);

    await this.auditService.log({
      staffId,
      event: AuthEventType.LOGOUT_ALL,
      ipAddress,
      userAgent,
    });

    return { loggedOut: true };
  }
}
