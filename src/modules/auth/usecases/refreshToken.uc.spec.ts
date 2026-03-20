import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenUsecase } from './refreshToken.uc';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { EventLogService } from '../services/eventLog.service';
import { RefreshTokenRepository } from '@adapters/repositories/refreshToken.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RequestContextService } from '@shared/context/requestContext.service';

const AUTH = { db: CacheDbType.AUTH };

describe('RefreshTokenUsecase', () => {
  let usecase: RefreshTokenUsecase;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let sessionService: ReturnType<typeof mock<SessionService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let refreshTokenRepo: ReturnType<typeof mock<RefreshTokenRepository>>;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;
  let cacheAdapter: ReturnType<typeof mock<CacheAdapter>>;
  let configService: ReturnType<typeof mock<ConfigService>>;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  const activeStaff = { id: 'staff-1', isActive: true, isApproved: true, role: { alias: 'admin' } };
  const validToken = {
    id: 'token-1',
    tokenHash: 'hash-1',
    staffId: 'staff-1',
    familyId: 'family-1',
    isRevoked: false,
    expiresAt: new Date(Date.now() + 86400000),
  };

  beforeEach(() => {
    tokenService = mock<TokenService>();
    sessionService = mock<SessionService>();
    eventLogService = mock<EventLogService>();
    refreshTokenRepo = mock<RefreshTokenRepository>();
    staffRepo = mock<StaffRepository>();
    cacheAdapter = mock<CacheAdapter>();
    configService = mock<ConfigService>();
    requestContextService = mock<RequestContextService>();
    em = mock<EntityManager>();

    requestContextService.getIp.mockReturnValue('127.0.0.1');
    requestContextService.getUserAgent.mockReturnValue('test-agent');

    usecase = new RefreshTokenUsecase(
      tokenService,
      sessionService,
      eventLogService,
      refreshTokenRepo,
      staffRepo,
      cacheAdapter,
      configService,
      requestContextService,
    );

    eventLogService.log.mockResolvedValue(undefined);
    tokenService.sha256.mockReturnValue('hash-1');
    tokenService.generateJti.mockReturnValue('new-jti');
    tokenService.signAccessToken.mockReturnValue('new-access-token');
    tokenService.generateOpaqueToken.mockReturnValue('new-opaque');
    configService.get.mockReturnValue(604800);
    cacheAdapter.del.mockResolvedValue(undefined);
  });

  it('should rotate token and return accessToken + newRefreshToken', async () => {
    refreshTokenRepo.findByTokenHash.mockResolvedValue(validToken as any);
    staffRepo.findOne.mockResolvedValue(activeStaff as any);
    refreshTokenRepo.revokeToken.mockResolvedValue(undefined);
    refreshTokenRepo.createToken.mockResolvedValue({} as any);

    const result = await usecase.execute(em, { refreshToken: 'opaque-cookie' });

    expect(result).toEqual({ accessToken: 'new-access-token', newRefreshToken: 'new-opaque' });
    expect(refreshTokenRepo.revokeToken).toHaveBeenCalled();
    expect(refreshTokenRepo.createToken).toHaveBeenCalled();
    expect(cacheAdapter.del).toHaveBeenCalledWith(expect.any(String), AUTH);
  });

  it('should throw if no refresh token provided', async () => {
    await expect(usecase.execute(em, { refreshToken: '' })).rejects.toThrow(UnauthorizedException);
  });

  it('should throw if token not found in DB', async () => {
    refreshTokenRepo.findByTokenHash.mockResolvedValue(null);
    await expect(usecase.execute(em, { refreshToken: 'cookie' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should detect token theft (revoked token reuse) and revoke family', async () => {
    refreshTokenRepo.findByTokenHash.mockResolvedValue({ ...validToken, isRevoked: true } as any);
    sessionService.revokeFamily.mockResolvedValue(undefined);

    await expect(usecase.execute(em, { refreshToken: 'cookie' })).rejects.toThrow(
      UnauthorizedException,
    );

    expect(sessionService.revokeFamily).toHaveBeenCalledWith('staff-1', 'family-1');
  });

  it('should throw if token is expired', async () => {
    const expiredToken = { ...validToken, expiresAt: new Date(Date.now() - 1000) };
    refreshTokenRepo.findByTokenHash.mockResolvedValue(expiredToken as any);
    refreshTokenRepo.revokeToken.mockResolvedValue(undefined);

    await expect(usecase.execute(em, { refreshToken: 'cookie' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw if staff is inactive', async () => {
    refreshTokenRepo.findByTokenHash.mockResolvedValue(validToken as any);
    staffRepo.findOne.mockResolvedValue({ ...activeStaff, isActive: false } as any);

    await expect(usecase.execute(em, { refreshToken: 'cookie' })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
