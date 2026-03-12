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
import { RedisService } from '@shared/redis/redis.service';

describe('RefreshTokenUsecase', () => {
  let usecase: RefreshTokenUsecase;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let sessionService: ReturnType<typeof mock<SessionService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let refreshTokenRepo: ReturnType<typeof mock<RefreshTokenRepository>>;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;
  let redisService: ReturnType<typeof mock<RedisService>>;
  let configService: ReturnType<typeof mock<ConfigService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  const mockRes = { cookie: vi.fn(), clearCookie: vi.fn() } as any;
  const mockReq = (cookie?: string) =>
    ({ cookies: cookie ? { refresh_token: cookie } : {} }) as any;

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
    redisService = mock<RedisService>();
    configService = mock<ConfigService>();
    em = mock<EntityManager>();

    usecase = new RefreshTokenUsecase(
      tokenService,
      sessionService,
      eventLogService,
      refreshTokenRepo,
      staffRepo,
      redisService,
      configService,
    );

    eventLogService.log.mockResolvedValue(undefined);
    tokenService.sha256.mockReturnValue('hash-1');
    tokenService.generateJti.mockReturnValue('new-jti');
    tokenService.signAccessToken.mockReturnValue('new-access-token');
    tokenService.generateOpaqueToken.mockReturnValue('new-opaque');
    tokenService.setAuthCookies.mockReturnValue(undefined);
    tokenService.clearAuthCookies.mockReturnValue(undefined);
    configService.get.mockReturnValue(604800);
    redisService.del.mockResolvedValue(undefined);
  });

  it('should rotate token and return { refreshed: true }', async () => {
    refreshTokenRepo.findByTokenHash.mockResolvedValue(validToken as any);
    staffRepo.findOne.mockResolvedValue(activeStaff as any);
    refreshTokenRepo.revokeToken.mockResolvedValue(undefined);
    refreshTokenRepo.createToken.mockResolvedValue({} as any);

    const result = await usecase.execute(em, {
      req: mockReq('opaque-cookie'),
      res: mockRes,
    });

    expect(result).toEqual({ refreshed: true });
    expect(refreshTokenRepo.revokeToken).toHaveBeenCalled();
    expect(refreshTokenRepo.createToken).toHaveBeenCalled();
  });

  it('should throw if no refresh token cookie', async () => {
    await expect(usecase.execute(em, { req: mockReq(), res: mockRes })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw if token not found in DB', async () => {
    refreshTokenRepo.findByTokenHash.mockResolvedValue(null);
    await expect(usecase.execute(em, { req: mockReq('cookie'), res: mockRes })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should detect token theft (revoked token reuse) and revoke family', async () => {
    refreshTokenRepo.findByTokenHash.mockResolvedValue({ ...validToken, isRevoked: true } as any);
    sessionService.revokeFamily.mockResolvedValue(undefined);

    await expect(usecase.execute(em, { req: mockReq('cookie'), res: mockRes })).rejects.toThrow(
      UnauthorizedException,
    );

    expect(sessionService.revokeFamily).toHaveBeenCalledWith('staff-1', 'family-1');
  });

  it('should throw if token is expired', async () => {
    const expiredToken = { ...validToken, expiresAt: new Date(Date.now() - 1000) };
    refreshTokenRepo.findByTokenHash.mockResolvedValue(expiredToken as any);
    refreshTokenRepo.revokeToken.mockResolvedValue(undefined);

    await expect(usecase.execute(em, { req: mockReq('cookie'), res: mockRes })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw if staff is inactive', async () => {
    refreshTokenRepo.findByTokenHash.mockResolvedValue(validToken as any);
    staffRepo.findOne.mockResolvedValue({ ...activeStaff, isActive: false } as any);

    await expect(usecase.execute(em, { req: mockReq('cookie'), res: mockRes })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
