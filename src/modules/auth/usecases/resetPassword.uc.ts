import { Usecase } from '@broker/types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ResetPasswordDto } from '../dto/resetPassword.dto';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { TokenService } from '../services/token.service';
import { EventLogService } from '../services/eventLog.service';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { RedisService } from '@shared/redis/redis.service';
import { RedisKeys } from '@shared/redis/redis.constants';
import { EventModule, EventType } from '../../core/entities/eventLog.entity';

@Injectable()
export class ResetPasswordUsecase extends Usecase<{ message: string }> {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly tokenService: TokenService,
    private readonly eventLogService: EventLogService,
    private readonly staffRepository: StaffRepository,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    params: ResetPasswordDto & { ipAddress?: string; userAgent?: string },
  ): Promise<{ message: string }> {
    const { token, newPassword, ipAddress, userAgent } = params;

    const tokenHash = this.tokenService.sha256(token);
    const data = await this.redisService.getJson<{ staffId: string }>(RedisKeys.pwReset(tokenHash));

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
    await this.redisService.del(RedisKeys.pwReset(tokenHash));

    await this.eventLogService.log({
      actorId: data.staffId,
      event: EventType.PASSWORD_RESET_COMPLETED,
      module: EventModule.AUTH,
      ipAddress,
      userAgent,
    });

    return { message: 'Password reset successfully. Please log in again.' };
  }
}
