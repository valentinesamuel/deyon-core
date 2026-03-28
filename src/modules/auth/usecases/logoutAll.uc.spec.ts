import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { LogoutAllUsecase } from './logoutAll.uc';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { EventLogService } from '../services/eventLog.service';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RequestContextService } from '@shared/context/requestContext.service';

describe('LogoutAllUsecase', () => {
  let usecase: LogoutAllUsecase;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let sessionService: ReturnType<typeof mock<SessionService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let cacheAdapter: ReturnType<typeof mock<CacheAdapter>>;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  beforeEach(() => {
    tokenService = mock<TokenService>();
    sessionService = mock<SessionService>();
    eventLogService = mock<EventLogService>();
    cacheAdapter = mock<CacheAdapter>();
    requestContextService = mock<RequestContextService>();
    em = mock<EntityManager>();

    requestContextService.getUserId.mockReturnValue('staff-1');
    requestContextService.getIp.mockReturnValue('127.0.0.1');
    requestContextService.getUserAgent.mockReturnValue('test-agent');

    usecase = new LogoutAllUsecase(
      tokenService,
      sessionService,
      eventLogService,
      cacheAdapter,
      requestContextService,
    );

    eventLogService.log.mockResolvedValue(undefined);
    sessionService.revokeAllSessions.mockResolvedValue(undefined);
    cacheAdapter.del.mockResolvedValue(undefined);
  });

  it('should revoke all sessions and return { loggedOut: true }', async () => {
    const payload = { sub: 'staff-1', jti: 'jti-1', exp: Math.floor(Date.now() / 1000) + 900 };
    tokenService.verifyAccessToken.mockReturnValue(payload as any);
    cacheAdapter.set.mockResolvedValue(undefined);

    const result = await usecase.execute(em, { accessToken: 'access-token' });

    expect(result).toEqual({ loggedOut: true });
    expect(sessionService.revokeAllSessions).toHaveBeenCalledWith('staff-1');
    expect(cacheAdapter.set).toHaveBeenCalledWith(
      expect.any(String),
      '1',
      expect.objectContaining({ db: CacheDbType.AUTH }),
    );
  });

  it('should revoke sessions even without access token', async () => {
    const result = await usecase.execute(em, { accessToken: '' });

    expect(result).toEqual({ loggedOut: true });
    expect(sessionService.revokeAllSessions).toHaveBeenCalledWith('staff-1');
  });
});
