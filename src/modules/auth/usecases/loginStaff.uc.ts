import { Usecase } from '@broker/types';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { StaffLoginDto } from '../dto/staffLogin.dto';
import { AuthService } from '../services/auth.service';
import { EventLogService } from '../services/eventLog.service';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { EventModule, EventType } from '../../core/entities/eventLog.entity';

export interface LoginStaffResult {
  requiresMfa: boolean;
  mfaToken: string;
}

@Injectable()
export class LoginStaffUsecase extends Usecase<LoginStaffResult> {
  private readonly logger = new Logger(LoginStaffUsecase.name);

  constructor(
    private readonly authService: AuthService,
    private readonly eventLogService: EventLogService,
    private readonly staffRepository: StaffRepository,
  ) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    params: StaffLoginDto & { ipAddress?: string; userAgent?: string },
  ): Promise<LoginStaffResult> {
    const { email, password, ipAddress, userAgent } = params;

    // 1. Check Redis lockout
    await this.authService.checkLockout(email);

    // 2. Find staff with passwordHash (select: false requires explicit select)
    const staff = await this.staffRepository.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'passwordHash',
        'isActive',
        'isApproved',
        'failedLoginAttempts',
        'lockedUntil',
        'mfaEnabled',
      ],
    });

    if (!staff) {
      // Always same error to prevent email enumeration
      await this.eventLogService.log({
        event: EventType.LOGIN_FAILED,
        module: EventModule.AUTH,
        ipAddress,
        userAgent,
        metadata: { reason: 'staff_not_found' },
        success: false,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Validate account status
    await this.authService.validateStaffStatus(staff);

    // 4. Verify password
    const isPasswordValid = await this.authService.verifyPassword(staff.passwordHash, password);

    if (!isPasswordValid) {
      await this.authService.recordFailedAttempt(email, staff.id);
      await this.eventLogService.log({
        actorId: staff.id,
        event: EventType.LOGIN_FAILED,
        module: EventModule.AUTH,
        ipAddress,
        userAgent,
        metadata: { reason: 'invalid_password' },
        success: false,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // 5. Clear failed attempts on success
    await this.authService.clearFailedAttempts(email);

    // 6. Issue ephemeral MFA token (no cookies yet — step 1 of 2)
    const mfaToken = await this.authService.issueEphemeralMfaToken(staff.id);

    await this.eventLogService.log({
      actorId: staff.id,
      event: EventType.LOGIN_SUCCESS,
      module: EventModule.AUTH,
      ipAddress,
      userAgent,
      metadata: { step: 'credentials_verified' },
    });

    return { requiresMfa: true, mfaToken };
  }
}
