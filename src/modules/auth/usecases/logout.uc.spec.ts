import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { LogoutUsecase } from './logout.uc';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { EventLogService } from '../services/eventLog.service';
import { RefreshTokenRepository } from '@adapters/repositories/refreshToken.repository';
import { RedisService } from '@shared/redis/redis.service';

describe('LogoutUsecase', () => {
  let usecase: LogoutUsecase;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let sessionService: ReturnType<typeof mock<SessionService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let refreshTokenRepo: ReturnType<typeof mock<RefreshTokenRepository>>;
  let redisService: ReturnType<typeof mock<RedisService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  const mockRes = { clearCookie: vi.fn() } as any;

  beforeEach(() => {
    tokenService = mock<TokenService>();
    sessionService = mock<SessionService>();
    eventLogService = mock<EventLogService>();
    refreshTokenRepo = mock<RefreshTokenRepository>();
    redisService = mock<RedisService>();
    em = mock<EntityManager>();

    usecase = new LogoutUsecase(
      tokenService,
      sessionService,
      eventLogService,
      refreshTokenRepo,
      redisService,
    );

    eventLogService.log.mockResolvedValue(undefined);
    tokenService.clearAuthCookies.mockReturnValue(undefined);
  });

  it('should logout using access token JTI blocklist', async () => {
    const payload = { sub: 'staff-1', jti: 'jti-1', exp: Math.floor(Date.now() / 1000) + 900 };
    tokenService.verifyAccessToken.mockReturnValue(payload as any);
    redisService.set.mockResolvedValue(undefined);
    tokenService.sha256.mockReturnValue('hash-1');
    refreshTokenRepo.findByTokenHash.mockResolvedValue({
      staffId: 'staff-1',
      familyId: 'fam-1',
    } as any);
    refreshTokenRepo.revokeToken.mockResolvedValue(undefined);
    sessionService.removeSession.mockResolvedValue(undefined);

    const result = await usecase.execute(em, {
      req: { cookies: { access_token: 'access', refresh_token: 'refresh' } } as any,
      res: mockRes,
    });

    expect(result).toEqual({ loggedOut: true });
    expect(redisService.set).toHaveBeenCalled(); // JTI blocklisted
    expect(tokenService.clearAuthCookies).toHaveBeenCalled();
  });

  it('should logout using refresh token only', async () => {
    tokenService.verifyAccessToken.mockReturnValue(null);
    tokenService.sha256.mockReturnValue('hash-1');
    refreshTokenRepo.findByTokenHash.mockResolvedValue({
      staffId: 'staff-1',
      familyId: 'fam-1',
    } as any);
    refreshTokenRepo.revokeToken.mockResolvedValue(undefined);
    sessionService.removeSession.mockResolvedValue(undefined);

    const result = await usecase.execute(em, {
      req: { cookies: { refresh_token: 'refresh' } } as any,
      res: mockRes,
    });

    expect(result).toEqual({ loggedOut: true });
  });

  it('should throw UnauthorizedException if no active session found', async () => {
    tokenService.verifyAccessToken.mockReturnValue(null);
    tokenService.sha256.mockReturnValue('hash-1');
    refreshTokenRepo.findByTokenHash.mockResolvedValue(null);

    await expect(
      usecase.execute(em, {
        req: { cookies: { refresh_token: 'refresh' } } as any,
        res: mockRes,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
