import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { LoginStaffUsecase } from './loginStaff.uc';
import { AuthService } from '../services/auth.service';
import { EventLogService } from '../services/eventLog.service';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { RequestContextService } from '@shared/context/requestContext.service';

describe('LoginStaffUsecase', () => {
  let usecase: LoginStaffUsecase;
  let authService: ReturnType<typeof mock<AuthService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let staffRepository: ReturnType<typeof mock<StaffRepository>>;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  const mockStaff = {
    id: 'staff-uuid',
    email: 'test@example.com',
    passwordHash: '$argon2-hash',
    isActive: true,
    isApproved: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    mfaEnabled: true,
  };

  beforeEach(() => {
    authService = mock<AuthService>();
    eventLogService = mock<EventLogService>();
    staffRepository = mock<StaffRepository>();
    requestContextService = mock<RequestContextService>();
    em = mock<EntityManager>();

    requestContextService.getIp.mockReturnValue('127.0.0.1');
    requestContextService.getUserAgent.mockReturnValue('test-agent');

    usecase = new LoginStaffUsecase(
      authService,
      eventLogService,
      staffRepository,
      requestContextService,
    );
    eventLogService.log.mockResolvedValue(undefined);
  });

  it('should return requiresMfa and mfaToken on successful login', async () => {
    authService.checkLockout.mockResolvedValue(undefined);
    staffRepository.findOne.mockResolvedValue(mockStaff as any);
    authService.validateStaffStatus.mockResolvedValue(undefined);
    authService.verifyPassword.mockResolvedValue(true);
    authService.clearFailedAttempts.mockResolvedValue(undefined);
    authService.issueEphemeralMfaToken.mockResolvedValue('mfa-token-hex');

    const result = await usecase.execute(em, {
      email: 'test@example.com',
      password: 'TestPassword1!',
    });

    expect(result).toEqual({ requiresMfa: true, mfaToken: 'mfa-token-hex' });
  });

  it('should throw UnauthorizedException when account is locked out', async () => {
    authService.checkLockout.mockRejectedValue(
      new UnauthorizedException('Account is temporarily locked. Please try again later.'),
    );

    await expect(
      usecase.execute(em, { email: 'test@example.com', password: 'pass' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException and log event when staff not found', async () => {
    authService.checkLockout.mockResolvedValue(undefined);
    staffRepository.findOne.mockResolvedValue(null);

    await expect(
      usecase.execute(em, { email: 'nobody@example.com', password: 'pass' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(eventLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'LOGIN_FAILED',
        success: false,
        metadata: { reason: 'staff_not_found' },
      }),
      em,
    );
  });

  it('should throw UnauthorizedException when staff is inactive', async () => {
    authService.checkLockout.mockResolvedValue(undefined);
    staffRepository.findOne.mockResolvedValue({ ...mockStaff, isActive: false } as any);
    authService.validateStaffStatus.mockRejectedValue(
      new UnauthorizedException('Account is not active.'),
    );

    await expect(
      usecase.execute(em, { email: 'test@example.com', password: 'pass' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when staff is not approved', async () => {
    authService.checkLockout.mockResolvedValue(undefined);
    staffRepository.findOne.mockResolvedValue({ ...mockStaff, isApproved: false } as any);
    authService.validateStaffStatus.mockRejectedValue(
      new UnauthorizedException('Account is pending approval.'),
    );

    await expect(
      usecase.execute(em, { email: 'test@example.com', password: 'pass' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should record failed attempt and throw UnauthorizedException on wrong password', async () => {
    authService.checkLockout.mockResolvedValue(undefined);
    staffRepository.findOne.mockResolvedValue(mockStaff as any);
    authService.validateStaffStatus.mockResolvedValue(undefined);
    authService.verifyPassword.mockResolvedValue(false);
    authService.recordFailedAttempt.mockResolvedValue(undefined);

    await expect(
      usecase.execute(em, { email: 'test@example.com', password: 'WrongPass' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(authService.recordFailedAttempt).toHaveBeenCalledWith(
      'test@example.com',
      'staff-uuid',
      em,
    );
    expect(eventLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'staff-uuid',
        event: 'LOGIN_FAILED',
        success: false,
        metadata: { reason: 'invalid_password' },
      }),
      em,
    );
  });
});
