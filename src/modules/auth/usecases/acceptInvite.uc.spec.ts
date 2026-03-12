import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AcceptInviteUsecase } from './acceptInvite.uc';
import { InviteTokenRepository } from '@adapters/repositories/inviteToken.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { AuthService } from '../services/auth.service';
import { EventLogService } from '../services/eventLog.service';
import { TokenService } from '../services/token.service';
import { RedisService } from '@shared/redis/redis.service';

describe('AcceptInviteUsecase', () => {
  let usecase: AcceptInviteUsecase;
  let inviteTokenRepo: ReturnType<typeof mock<InviteTokenRepository>>;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;
  let authService: ReturnType<typeof mock<AuthService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let redisService: ReturnType<typeof mock<RedisService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  const validInvite = {
    id: 'invite-1',
    email: 'new@example.com',
    roleId: 'role-1',
    departmentId: 'dept-1',
    isUsed: false,
    expiresAt: new Date(Date.now() + 86400000),
  };

  const params = {
    token: 'plain-token',
    firstName: 'Jane',
    lastName: 'Doe',
    phoneNumber: '+1234567890',
    password: 'NewPass1!',
    licenseNumber: 'LIC123',
    specialization: 'Cardiology',
  };

  beforeEach(() => {
    inviteTokenRepo = mock<InviteTokenRepository>();
    staffRepo = mock<StaffRepository>();
    authService = mock<AuthService>();
    eventLogService = mock<EventLogService>();
    tokenService = mock<TokenService>();
    redisService = mock<RedisService>();
    em = mock<EntityManager>();

    usecase = new AcceptInviteUsecase(
      inviteTokenRepo,
      staffRepo,
      authService,
      eventLogService,
      tokenService,
      redisService,
    );

    tokenService.sha256.mockReturnValue('token-hash');
    eventLogService.log.mockResolvedValue(undefined);
    redisService.getJson.mockResolvedValue(null);
    redisService.del.mockResolvedValue(undefined);
  });

  it('should create staff and return setupToken', async () => {
    inviteTokenRepo.findByTokenHashAndFailIfNotExist.mockResolvedValue(validInvite as any);
    staffRepo.findOne.mockResolvedValue(null); // no duplicate
    authService.hashPassword.mockResolvedValue('hashed-pw');
    staffRepo.createStaff.mockResolvedValue({ id: 'staff-new' } as any);
    inviteTokenRepo.markAsUsed.mockResolvedValue(undefined);
    authService.issueEphemeralSetupToken.mockResolvedValue('setup-token');

    const result = await usecase.execute(em, params);

    expect(result).toEqual({
      requiresMfaSetup: true,
      setupToken: 'setup-token',
      staffId: 'staff-new',
    });
  });

  it('should throw if invite is already used', async () => {
    inviteTokenRepo.findByTokenHashAndFailIfNotExist.mockResolvedValue({
      ...validInvite,
      isUsed: true,
    } as any);

    await expect(usecase.execute(em, params)).rejects.toThrow(BadRequestException);
  });

  it('should throw if invite is expired', async () => {
    inviteTokenRepo.findByTokenHashAndFailIfNotExist.mockResolvedValue({
      ...validInvite,
      expiresAt: new Date(Date.now() - 1000),
    } as any);

    await expect(usecase.execute(em, params)).rejects.toThrow(BadRequestException);
  });

  it('should throw ConflictException if email already registered', async () => {
    inviteTokenRepo.findByTokenHashAndFailIfNotExist.mockResolvedValue(validInvite as any);
    staffRepo.findOne.mockResolvedValue({ id: 'existing-staff' } as any);

    await expect(usecase.execute(em, params)).rejects.toThrow(ConflictException);
  });
});
