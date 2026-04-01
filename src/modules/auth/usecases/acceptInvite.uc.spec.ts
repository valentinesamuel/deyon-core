import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AcceptInviteUsecase } from './acceptInvite.uc';
import { InviteTokenRepository } from '@adapters/repositories/inviteToken.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { AuthService } from '../services/auth.service';
import { EventLogService } from '../services/eventLog.service';
import { TokenService } from '../services/token.service';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RequestContextService } from '@shared/context/requestContext.service';

const AUTH = { db: CacheDbType.AUTH };

describe('AcceptInviteUsecase', () => {
  let usecase: AcceptInviteUsecase;
  let inviteTokenRepo: ReturnType<typeof mock<InviteTokenRepository>>;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;
  let authService: ReturnType<typeof mock<AuthService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let cacheAdapter: ReturnType<typeof mock<CacheAdapter>>;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;
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
    cacheAdapter = mock<CacheAdapter>();
    requestContextService = mock<RequestContextService>();
    em = mock<EntityManager>();

    requestContextService.getIp.mockReturnValue('127.0.0.1');
    requestContextService.getUserAgent.mockReturnValue('test-agent');

    usecase = new AcceptInviteUsecase(
      inviteTokenRepo,
      staffRepo,
      authService,
      eventLogService,
      tokenService,
      cacheAdapter,
      requestContextService,
    );

    tokenService.sha256.mockReturnValue('token-hash');
    eventLogService.log.mockResolvedValue(undefined);
    cacheAdapter.get.mockResolvedValue(null);
    cacheAdapter.del.mockResolvedValue(undefined);
  });

  it('should create staff and return setupToken', async () => {
    inviteTokenRepo.findByTokenHashAndFailIfNotExist.mockResolvedValue(validInvite as any);
    staffRepo.findOneOrFailIfExists.mockResolvedValue(undefined);
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
    expect(cacheAdapter.get).toHaveBeenCalledWith(expect.any(String), AUTH);
    expect(cacheAdapter.del).toHaveBeenCalledWith(expect.any(String), AUTH);
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
    staffRepo.findOneOrFailIfExists.mockRejectedValue(
      new ConflictException('Email already registered'),
    );

    await expect(usecase.execute(em, params)).rejects.toThrow(ConflictException);
  });
});
