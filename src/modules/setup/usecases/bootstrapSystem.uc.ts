import { Usecase, UsecaseConfig } from '@broker/types';
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { BootstrapSystemDto } from '../dto/bootstrapSystem.dto';
import { MfaConfigRepository } from '@adapters/repositories/mfaConfig.repository';
import { SystemConfigRepository } from '@adapters/repositories/systemConfig.repository';
import { RoleRepository } from '@adapters/repositories/role.repository';
import { MfaService } from '@modules/auth/services/mfa.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Staff } from '@modules/core/entities/staff.entity';
import { SystemConfig } from '@modules/core/entities/systemConfig.entity';
import { RedisService } from '@shared/redis/redis.service';
import { RedisKeys } from '@shared/redis/redis.constants';

export interface BootstrapSystemResult {
  success: boolean;
  roleAssigned: string;
}

@Injectable()
export class BootstrapSystemUsecase extends Usecase<BootstrapSystemResult> {
  private readonly logger = new Logger(BootstrapSystemUsecase.name);
  readonly config: UsecaseConfig = { requiresTransaction: true };

  constructor(
    private readonly mfaConfigRepository: MfaConfigRepository,
    private readonly systemConfigRepository: SystemConfigRepository,
    private readonly roleRepository: RoleRepository,
    private readonly mfaService: MfaService,
    private readonly eventLogService: EventLogService,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async execute(
    entityManager: EntityManager,
    params: BootstrapSystemDto & { staffId: string; ipAddress?: string; userAgent?: string },
  ): Promise<BootstrapSystemResult> {
    const { staffId, totpCode, ipAddress, userAgent } = params;

    // 1. Pessimistic write lock on system_config (race-condition guard)
    const config = await entityManager.findOne(SystemConfig, {
      where: { key: 'setup_complete' },
      lock: { mode: 'pessimistic_write' },
    });
    if ((config?.value as { completed?: boolean })?.completed === true) {
      throw new ConflictException('System setup has already been completed');
    }

    // 2. Load CMO's MFA config
    const mfaConfig = await this.mfaConfigRepository.findByStaffId(staffId);
    if (!mfaConfig) {
      throw new UnauthorizedException('MFA not configured');
    }

    // 3. Verify TOTP (MfaService handles decryption internally)
    const valid = await this.mfaService.verifyTotp(mfaConfig.encryptedSecret, totpCode);
    if (!valid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // 4. Find super_admin role
    const role = await this.roleRepository.findOne({ where: { alias: 'super_admin' } });
    if (!role) {
      throw new InternalServerErrorException('super_admin role not found — run migrations first');
    }

    // 5. Assign super_admin role to CMO
    await entityManager.update(Staff, staffId, { roleId: role.id });

    // 6. Mark setup as complete
    await entityManager.update(
      SystemConfig,
      { key: 'setup_complete' },
      {
        value: {
          completed: true,
          completedAt: new Date().toISOString(),
          completedBy: staffId,
        },
      },
    );

    // 7. Log event
    await this.eventLogService.log({
      actorId: staffId,
      event: EventType.SETUP_COMPLETED,
      module: EventModule.SETUP,
      ipAddress,
      userAgent,
    });

    // 8. Invalidate Redis profile cache (fire-and-forget)
    try {
      await this.redisService.del(RedisKeys.profile(staffId));
    } catch (err) {
      this.logger.warn('Failed to invalidate profile cache', err);
    }

    return { success: true, roleAssigned: role.alias };
  }
}
