import { Usecase } from '@broker/types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Request, Response } from 'express';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { EventLogService } from '../services/eventLog.service';
import { RefreshTokenRepository } from '@adapters/repositories/refreshToken.repository';
import { RedisService } from '@shared/redis/redis.service';
import { RedisKeys } from '@shared/redis/redis.constants';
import { EventModule, EventType } from '../../core/entities/eventLog.entity';

@Injectable()
export class LogoutUsecase extends Usecase<{ loggedOut: boolean }> {
  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly eventLogService: EventLogService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    params: { req: Request; res: Response; ipAddress?: string; userAgent?: string },
  ): Promise<{ loggedOut: boolean }> {
    const { req, res, ipAddress, userAgent } = params;

    const accessToken = req?.cookies?.access_token;
    const refreshToken = req?.cookies?.refresh_token;

    let staffId: string | undefined;

    // Blocklist the JWT jti
    if (accessToken) {
      const payload = this.tokenService.verifyAccessToken(accessToken);
      if (payload) {
        staffId = payload.sub;
        // TTL = remaining lifetime of token
        const remainingTtl = payload['exp'] ? payload['exp'] - Math.floor(Date.now() / 1000) : 900;
        if (remainingTtl > 0) {
          await this.redisService.set(RedisKeys.jtiBlocklist(payload.jti), '1', remainingTtl);
        }
      }
    }

    // Revoke refresh token
    if (refreshToken) {
      const tokenHash = this.tokenService.sha256(refreshToken);
      const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);
      if (stored) {
        staffId = staffId ?? stored.staffId;
        await this.refreshTokenRepository.revokeToken(tokenHash);
        await this.sessionService.removeSession(stored.staffId, stored.familyId);
      }
    }

    if (!staffId) throw new UnauthorizedException('No active session found');

    this.tokenService.clearAuthCookies(res);

    await this.eventLogService.log({
      actorId: staffId,
      event: EventType.LOGOUT,
      module: EventModule.AUTH,
      ipAddress,
      userAgent,
    });

    return { loggedOut: true };
  }
}
