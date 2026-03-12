import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { LogoutAllUsecase } from './logoutAll.uc';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { EventLogService } from '../services/eventLog.service';
import { RedisService } from '@shared/redis/redis.service';

describe('LogoutAllUsecase', () => {
  let usecase: LogoutAllUsecase;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let sessionService: ReturnType<typeof mock<SessionService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let redisService: ReturnType<typeof mock<RedisService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  const mockRes = { clearCookie: vi.fn() } as any;
  const mockReq = (accessToken?: string) =>
    ({
      cookies: accessToken ? { access_token: accessToken } : {},
    }) as any;

  beforeEach(() => {
    tokenService = mock<TokenService>();
    sessionService = mock<SessionService>();
    eventLogService = mock<EventLogService>();
    redisService = mock<RedisService>();
    em = mock<EntityManager>();

    usecase = new LogoutAllUsecase(tokenService, sessionService, eventLogService, redisService);

    eventLogService.log.mockResolvedValue(undefined);
    tokenService.clearAuthCookies.mockReturnValue(undefined);
    sessionService.revokeAllSessions.mockResolvedValue(undefined);
    redisService.del.mockResolvedValue(undefined);
  });

  it('should revoke all sessions and return { loggedOut: true }', async () => {
    const payload = { sub: 'staff-1', jti: 'jti-1', exp: Math.floor(Date.now() / 1000) + 900 };
    tokenService.verifyAccessToken.mockReturnValue(payload as any);
    redisService.set.mockResolvedValue(undefined);

    const result = await usecase.execute(em, {
      req: mockReq('access-token'),
      res: mockRes,
      staffId: 'staff-1',
    });

    expect(result).toEqual({ loggedOut: true });
    expect(sessionService.revokeAllSessions).toHaveBeenCalledWith('staff-1');
    expect(tokenService.clearAuthCookies).toHaveBeenCalled();
    expect(redisService.set).toHaveBeenCalled(); // JTI blocklisted
  });

  it('should revoke sessions even without access token cookie', async () => {
    const result = await usecase.execute(em, {
      req: mockReq(),
      res: mockRes,
      staffId: 'staff-1',
    });

    expect(result).toEqual({ loggedOut: true });
    expect(sessionService.revokeAllSessions).toHaveBeenCalledWith('staff-1');
  });
});
