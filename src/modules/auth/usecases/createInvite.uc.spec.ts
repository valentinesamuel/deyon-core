import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { CreateInviteUsecase } from './createInvite.uc';
import { InviteTokenRepository } from '@adapters/repositories/inviteToken.repository';
import { TokenService } from '../services/token.service';
import { EventLogService } from '../services/eventLog.service';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RequestContextService } from '@shared/context/requestContext.service';

describe('CreateInviteUsecase', () => {
  let usecase: CreateInviteUsecase;
  let inviteTokenRepo: ReturnType<typeof mock<InviteTokenRepository>>;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let cacheAdapter: ReturnType<typeof mock<CacheAdapter>>;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  const params = {
    email: 'newstaff@example.com',
    roleId: 'role-uuid',
    departmentId: 'dept-uuid',
    invitedById: 'admin-uuid',
  };

  beforeEach(() => {
    inviteTokenRepo = mock<InviteTokenRepository>();
    tokenService = mock<TokenService>();
    eventLogService = mock<EventLogService>();
    cacheAdapter = mock<CacheAdapter>();
    requestContextService = mock<RequestContextService>();
    em = mock<EntityManager>();

    requestContextService.getIp.mockReturnValue('127.0.0.1');
    requestContextService.getUserAgent.mockReturnValue('test-agent');

    usecase = new CreateInviteUsecase(
      inviteTokenRepo,
      tokenService,
      eventLogService,
      cacheAdapter,
      requestContextService,
    );

    tokenService.generateOpaqueToken.mockReturnValue('plain-token-64hex');
    tokenService.sha256.mockReturnValue('token-hash-64hex');
    inviteTokenRepo.createToken.mockResolvedValue({} as any);
    cacheAdapter.set.mockResolvedValue(undefined);
    eventLogService.log.mockResolvedValue(undefined);
  });

  it('should return inviteToken and email', async () => {
    const result = await usecase.execute(em, params);

    expect(result).toEqual({
      inviteToken: 'plain-token-64hex',
      email: 'newstaff@example.com',
    });
  });

  it('should store invite in DB', async () => {
    await usecase.execute(em, params);

    expect(inviteTokenRepo.createToken).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: 'token-hash-64hex',
        email: 'newstaff@example.com',
        roleId: 'role-uuid',
      }),
      em,
    );
  });

  it('should cache invite', async () => {
    await usecase.execute(em, params);

    expect(cacheAdapter.set).toHaveBeenCalledWith(
      expect.stringContaining('token-hash-64hex'),
      expect.objectContaining({ email: 'newstaff@example.com' }),
      expect.objectContaining({ db: CacheDbType.AUTH }),
    );
  });

  it('should log the INVITE_SENT event', async () => {
    await usecase.execute(em, params);
    expect(eventLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin-uuid' }),
      em,
    );
  });
});
