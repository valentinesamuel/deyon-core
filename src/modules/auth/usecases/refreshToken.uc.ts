import { Usecase } from '@broker/types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { EventLogService } from '../services/eventLog.service';
import { RefreshTokenRepository } from '@adapters/repositories/refreshToken.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { RedisService } from '@shared/redis/redis.service';
import { RedisKeys } from '@shared/redis/redis.constants';
import { EventModule, EventType } from '../../core/entities/eventLog.entity';

@Injectable()
export class RefreshTokenUsecase extends Usecase<{ refreshed: boolean }> {
  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly eventLogService: EventLogService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly staffRepository: StaffRepository,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    params: { req: Request; res: Response; ipAddress?: string; userAgent?: string },
  ): Promise<{ refreshed: boolean }> {
    const { req, res, ipAddress, userAgent } = params;
    const opaqueToken = req?.cookies?.refresh_token;

    if (!opaqueToken) throw new UnauthorizedException('No refresh token provided');

    const tokenHash = this.tokenService.sha256(opaqueToken);
    const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    // Theft detection: token was already revoked
    if (stored.isRevoked) {
      await this.sessionService.revokeFamily(stored.staffId, stored.familyId);
      await this.eventLogService.log({
        actorId: stored.staffId,
        event: EventType.TOKEN_THEFT_DETECTED,
        module: EventModule.AUTH,
        ipAddress,
        userAgent,
        success: false,
      });
      this.tokenService.clearAuthCookies(res);
      throw new UnauthorizedException('Token reuse detected — all sessions terminated');
    }

    if (stored.expiresAt < new Date()) {
      await this.refreshTokenRepository.revokeToken(tokenHash);
      this.tokenService.clearAuthCookies(res);
      throw new UnauthorizedException('Refresh token expired');
    }

    const staff = await this.staffRepository.findOne({
      where: { id: stored.staffId },
      relations: ['role'],
    });
    if (!staff || !staff.isActive || !staff.isApproved) {
      this.tokenService.clearAuthCookies(res);
      throw new UnauthorizedException('Account is not active');
    }

    // Rotate: revoke old token, issue new pair
    await this.refreshTokenRepository.revokeToken(tokenHash);

    const newJti = this.tokenService.generateJti();
    const newAccessToken = this.tokenService.signAccessToken({
      sub: staff.id,
      jti: newJti,
      role: staff.role?.alias ?? '',
    });

    const newOpaqueToken = this.tokenService.generateOpaqueToken();
    const newTokenHash = this.tokenService.sha256(newOpaqueToken);
    const refreshExpiry = this.configService.get<number>('common.jwt.refreshExpiry');

    await this.refreshTokenRepository.createToken({
      tokenHash: newTokenHash,
      staffId: staff.id,
      familyId: stored.familyId,
      expiresAt: new Date(Date.now() + refreshExpiry * 1000),
      userAgent,
      ipAddress,
    });

    // Invalidate profile cache to pick up any role changes
    await this.redisService.del(RedisKeys.profile(staff.id));

    this.tokenService.setAuthCookies(res, newAccessToken, newOpaqueToken);

    await this.eventLogService.log({
      actorId: staff.id,
      event: EventType.TOKEN_REFRESHED,
      module: EventModule.AUTH,
      ipAddress,
      userAgent,
    });

    return { refreshed: true };
  }
}
