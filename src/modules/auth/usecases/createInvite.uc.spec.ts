import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { CreateInviteUsecase } from './createInvite.uc';
import { InviteTokenRepository } from '@adapters/repositories/inviteToken.repository';
import { TokenService } from '../services/token.service';
import { EventLogService } from '../services/eventLog.service';
import { RedisService } from '@shared/redis/redis.service';

describe('CreateInviteUsecase', () => {
  let usecase: CreateInviteUsecase;
  let inviteTokenRepo: ReturnType<typeof mock<InviteTokenRepository>>;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let redisService: ReturnType<typeof mock<RedisService>>;
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
    redisService = mock<RedisService>();
    em = mock<EntityManager>();

    usecase = new CreateInviteUsecase(inviteTokenRepo, tokenService, eventLogService, redisService);

    tokenService.generateOpaqueToken.mockReturnValue('plain-token-64hex');
    tokenService.sha256.mockReturnValue('token-hash-64hex');
    inviteTokenRepo.createToken.mockResolvedValue({} as any);
    redisService.setJson.mockResolvedValue(undefined);
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
    );
  });

  it('should cache invite in Redis', async () => {
    await usecase.execute(em, params);

    expect(redisService.setJson).toHaveBeenCalledWith(
      expect.stringContaining('token-hash-64hex'),
      expect.objectContaining({ email: 'newstaff@example.com' }),
      expect.any(Number),
    );
  });

  it('should log the INVITE_SENT event', async () => {
    await usecase.execute(em, params);
    expect(eventLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin-uuid' }),
    );
  });
});
