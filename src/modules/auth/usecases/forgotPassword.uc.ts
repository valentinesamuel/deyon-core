import { Usecase } from '@broker/types';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ForgotPasswordDto } from '../dto/forgotPassword.dto';
import { TokenService } from '../services/token.service';
import { EventLogService } from '../services/eventLog.service';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { RedisService } from '@shared/redis/redis.service';
import { RedisKeys, RedisTTL } from '@shared/redis/redis.constants';
import { EventModule, EventType } from '../../core/entities/eventLog.entity';
import { IEmailProvider, EMAIL_PROVIDER_TOKEN } from '@adapters/email/email.interface';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const RATE_LIMIT = 1;

@Injectable()
export class ForgotPasswordUsecase extends Usecase<{ message: string }> {
  private readonly logger = new Logger(ForgotPasswordUsecase.name);
  readonly config = { requiresTransaction: false };

  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly tokenService: TokenService,
    private readonly eventLogService: EventLogService,
    private readonly redisService: RedisService,
    @Inject(EMAIL_PROVIDER_TOKEN)
    private readonly emailProvider: IEmailProvider,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    params: ForgotPasswordDto & { ipAddress?: string; userAgent?: string },
  ): Promise<{ message: string }> {
    const { email, ipAddress, userAgent } = params;
    const SAME_RESPONSE = { message: 'If this email is registered, a reset link has been sent.' };

    // Rate limit: 1 reset per hour
    const rateKey = RedisKeys.pwResetRate(email);
    const count = await this.redisService.incr(rateKey);
    if (count === 1) {
      await this.redisService.expire(rateKey, RedisTTL.pwResetRate);
    }
    if (count > RATE_LIMIT) {
      return SAME_RESPONSE; // Silent rate limit (no enumeration)
    }

    const staff = await this.staffRepository.findOne({ where: { email } });
    if (!staff) return SAME_RESPONSE; // Prevent email enumeration

    const plainToken = this.tokenService.generateOpaqueToken();
    const tokenHash = this.tokenService.sha256(plainToken);

    await this.redisService.setJson(
      RedisKeys.pwReset(tokenHash),
      { staffId: staff.id },
      RedisTTL.pwReset,
    );

    const frontendUrl = this.configService.get<string>('common.frontendUrl');
    const resetLink = `${frontendUrl}/reset-password?token=${plainToken}`;

    try {
      await this.emailProvider.sendPasswordResetEmail({ to: email, resetLink });
    } catch (err) {
      this.logger.error(
        'Failed to send password reset email',
        err instanceof Error ? err.message : String(err),
      );
    }

    await this.eventLogService.log({
      actorId: staff.id,
      event: EventType.PASSWORD_RESET_REQUESTED,
      module: EventModule.AUTH,
      ipAddress,
      userAgent,
    });

    return SAME_RESPONSE;
  }
}
