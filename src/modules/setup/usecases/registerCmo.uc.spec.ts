import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { RegisterCmoUsecase } from './registerCmo.uc';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { AuthService } from '@modules/auth/services/auth.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';

describe('RegisterCmoUsecase', () => {
  let usecase: RegisterCmoUsecase;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;
  let authService: ReturnType<typeof mock<AuthService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  const params = {
    firstName: 'Chief',
    lastName: 'Medical',
    email: 'cmo@hospital.com',
    phoneNumber: '+1234567890',
    password: 'SecurePass1!',
  };

  beforeEach(() => {
    staffRepo = mock<StaffRepository>();
    authService = mock<AuthService>();
    eventLogService = mock<EventLogService>();
    em = mock<EntityManager>();

    usecase = new RegisterCmoUsecase(staffRepo, authService, eventLogService);

    eventLogService.log.mockResolvedValue(undefined);
    authService.hashPassword.mockResolvedValue('pw-hash');
    authService.issueEphemeralSetupToken.mockResolvedValue('setup-token');
    staffRepo.createStaff.mockResolvedValue({ id: 'cmo-uuid' } as any);
  });

  it('should create CMO and return { requiresMfaSetup: true, setupToken }', async () => {
    em.findOne.mockResolvedValue({ key: 'setup_complete', value: { completed: false } });
    em.count.mockResolvedValue(0);

    const result = await usecase.execute(em, params);

    expect(result).toEqual({ requiresMfaSetup: true, setupToken: 'setup-token' });
    expect(staffRepo.createStaff).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'cmo@hospital.com', isActive: true, isApproved: true }),
    );
  });

  it('should throw ConflictException if setup already complete', async () => {
    em.findOne.mockResolvedValue({ key: 'setup_complete', value: { completed: true } });

    await expect(usecase.execute(em, params)).rejects.toThrow(ConflictException);
  });

  it('should throw ConflictException if staff already exist', async () => {
    em.findOne.mockResolvedValue({ key: 'setup_complete', value: { completed: false } });
    em.count.mockResolvedValue(1); // staff exist

    await expect(usecase.execute(em, params)).rejects.toThrow(ConflictException);
  });
});
