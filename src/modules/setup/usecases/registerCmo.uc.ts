import { Usecase, UsecaseConfig } from '@broker/types';
import { Injectable, ConflictException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { RegisterCmoDto } from '../dto/registerCmo.dto';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { AuthService } from '@modules/auth/services/auth.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Staff } from '@modules/core/entities/staff.entity';
import { SystemConfig } from '@modules/core/entities/systemConfig.entity';

export interface RegisterCmoResult {
  requiresMfaSetup: boolean;
  setupToken: string;
}

@Injectable()
export class RegisterCmoUsecase extends Usecase<RegisterCmoResult> {
  readonly config: UsecaseConfig = { requiresTransaction: true };

  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly authService: AuthService,
    private readonly eventLogService: EventLogService,
  ) {
    super();
  }

  async execute(
    entityManager: EntityManager,
    params: RegisterCmoDto & { ipAddress?: string; userAgent?: string },
  ): Promise<RegisterCmoResult> {
    const { firstName, lastName, email, phoneNumber, password, ipAddress, userAgent } = params;

    // 1. Verify setup not complete (pessimistic read lock)
    const config = await entityManager.findOne(SystemConfig, {
      where: { key: 'setup_complete' },
      lock: { mode: 'pessimistic_read' },
    });
    if ((config?.value as { completed?: boolean })?.completed === true) {
      throw new ConflictException('System setup has already been completed');
    }

    // 2. Verify no staff exist yet
    const count = await entityManager.count(Staff);
    if (count > 0) {
      throw new ConflictException('Registration window is closed');
    }

    // 3. Hash password
    const passwordHash = await this.authService.hashPassword(password);

    // 4. Create CMO staff account
    const staff = await this.staffRepository.createStaff({
      firstName,
      lastName,
      email,
      phoneNumber,
      passwordHash,
      isActive: true,
      isApproved: true,
      mfaEnabled: false,
      roleId: undefined,
    });

    // 5. Issue MFA setup token
    const setupToken = await this.authService.issueEphemeralSetupToken(staff.id);

    // 6. Log event
    await this.eventLogService.log({
      actorId: staff.id,
      event: EventType.CMO_REGISTERED,
      module: EventModule.SETUP,
      ipAddress,
      userAgent,
    });

    return { requiresMfaSetup: true, setupToken };
  }
}
