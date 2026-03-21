import { Usecase } from '@broker/types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ResetPasswordDto } from '../dto/resetPassword.dto';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { TokenService } from '../services/token.service';
import { EventLogService } from '../services/eventLog.service';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RedisKeys } from '@adapters/cache/cache.constants';
import { EventModule, EventType } from '../../core/entities/eventLog.entity';
import { RequestContextService } from '@shared/context/requestContext.service';

@Injectable()
export class ResetPasswordUsecase extends Usecase<{ message: string }> {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly tokenService: TokenService,
    private readonly eventLogService: EventLogService,
    private readonly staffRepository: StaffRepository,
    private readonly cacheAdapter: CacheAdapter,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = params;
    const ipAddress = this.requestContextService.getIp() ?? undefined;
    const userAgent = this.requestContextService.getUserAgent() ?? undefined;

    const tokenHash = this.tokenService.sha256(token);
    const data = await this.cacheAdapter.get<{ staffId: string }>(RedisKeys.pwReset(tokenHash), {
      db: CacheDbType.AUTH,
    });

    if (!data) throw new UnauthorizedException('Invalid or expired reset token');

    const passwordHash = await this.authService.hashPassword(newPassword);

    await this.staffRepository.update(data.staffId, {
      passwordHash,
      lastPasswordChange: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null as unknown as Date,
    });

    // Revoke all sessions
    await this.sessionService.revokeAllSessions(data.staffId);

    // Delete the reset token
    await this.cacheAdapter.del(RedisKeys.pwReset(tokenHash), { db: CacheDbType.AUTH });

    await this.eventLogService.log(
      {
        actorId: data.staffId,
        event: EventType.PASSWORD_RESET_COMPLETED,
        module: EventModule.AUTH,
        ipAddress,
        userAgent,
      },
      em,
    );

    return { message: 'Password reset successfully. Please log in again.' };
  }
}
