import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { LogoutUsecase } from './logout.uc';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { EventLogService } from '../services/eventLog.service';
import { RefreshTokenRepository } from '@adapters/repositories/refreshToken.repository';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RequestContextService } from '@shared/context/requestContext.service';

describe('LogoutUsecase', () => {
  let usecase: LogoutUsecase;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let sessionService: ReturnType<typeof mock<SessionService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let refreshTokenRepo: ReturnType<typeof mock<RefreshTokenRepository>>;
  let cacheAdapter: ReturnType<typeof mock<CacheAdapter>>;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  beforeEach(() => {
    tokenService = mock<TokenService>();
    sessionService = mock<SessionService>();
    eventLogService = mock<EventLogService>();
    refreshTokenRepo = mock<RefreshTokenRepository>();
    cacheAdapter = mock<CacheAdapter>();
    requestContextService = mock<RequestContextService>();
    em = mock<EntityManager>();

    requestContextService.getIp.mockReturnValue('127.0.0.1');
    requestContextService.getUserAgent.mockReturnValue('test-agent');

    usecase = new LogoutUsecase(
      tokenService,
      sessionService,
      eventLogService,
      refreshTokenRepo,
      cacheAdapter,
      requestContextService,
    );

    eventLogService.log.mockResolvedValue(undefined);
  });

  it('should logout using access token JTI blocklist and refresh token revocation', async () => {
    const payload = { sub: 'staff-1', jti: 'jti-1', exp: Math.floor(Date.now() / 1000) + 900 };
    tokenService.verifyAccessToken.mockReturnValue(payload as any);
    cacheAdapter.set.mockResolvedValue(undefined);
    tokenService.sha256.mockReturnValue('hash-1');
    refreshTokenRepo.findByTokenHash.mockResolvedValue({
      staffId: 'staff-1',
      familyId: 'fam-1',
    } as any);
    refreshTokenRepo.revokeToken.mockResolvedValue(undefined);
    sessionService.removeSession.mockResolvedValue(undefined);

    const result = await usecase.execute(em, {
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    expect(result).toEqual({ loggedOut: true });
    expect(cacheAdapter.set).toHaveBeenCalledWith(
      expect.stringContaining('jti-1'),
      '1',
      expect.objectContaining({ db: CacheDbType.AUTH }),
    );
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
      accessToken: '',
      refreshToken: 'refresh',
    });

    expect(result).toEqual({ loggedOut: true });
  });

  it('should throw UnauthorizedException if no active session found', async () => {
    tokenService.verifyAccessToken.mockReturnValue(null);
    tokenService.sha256.mockReturnValue('hash-1');
    refreshTokenRepo.findByTokenHash.mockResolvedValue(null);

    await expect(usecase.execute(em, { accessToken: '', refreshToken: 'refresh' })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
