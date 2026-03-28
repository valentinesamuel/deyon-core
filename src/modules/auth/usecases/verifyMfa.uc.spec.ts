import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VerifyMfaUsecase } from './verifyMfa.uc';
import { MfaService } from '../services/mfa.service';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { EventLogService } from '../services/eventLog.service';
import { RefreshTokenRepository } from '@adapters/repositories/refreshToken.repository';
import { MfaConfigRepository } from '@adapters/repositories/mfaConfig.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RequestContextService } from '@shared/context/requestContext.service';

const AUTH = { db: CacheDbType.AUTH };

describe('VerifyMfaUsecase', () => {
  let usecase: VerifyMfaUsecase;
  let mfaService: ReturnType<typeof mock<MfaService>>;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let sessionService: ReturnType<typeof mock<SessionService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let refreshTokenRepo: ReturnType<typeof mock<RefreshTokenRepository>>;
  let mfaConfigRepo: ReturnType<typeof mock<MfaConfigRepository>>;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;
  let cacheAdapter: ReturnType<typeof mock<CacheAdapter>>;
  let configService: ReturnType<typeof mock<ConfigService>>;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  const mockStaff = { id: 'staff-1', firstName: 'John', lastName: 'Doe', role: { alias: 'admin' } };
  const mockMfaConfig = { encryptedSecret: 'enc-secret' };

  const params = {
    mfaToken: 'mfa-token-1',
    totpCode: '123456',
  };

  beforeEach(() => {
    mfaService = mock<MfaService>();
    tokenService = mock<TokenService>();
    sessionService = mock<SessionService>();
    eventLogService = mock<EventLogService>();
    refreshTokenRepo = mock<RefreshTokenRepository>();
    mfaConfigRepo = mock<MfaConfigRepository>();
    staffRepo = mock<StaffRepository>();
    cacheAdapter = mock<CacheAdapter>();
    configService = mock<ConfigService>();
    requestContextService = mock<RequestContextService>();
    em = mock<EntityManager>();

    requestContextService.getUserId.mockReturnValue('staff-1');
    requestContextService.getIp.mockReturnValue('127.0.0.1');
    requestContextService.getUserAgent.mockReturnValue('test');

    usecase = new VerifyMfaUsecase(
      mfaService,
      tokenService,
      sessionService,
      eventLogService,
      refreshTokenRepo,
      mfaConfigRepo,
      staffRepo,
      cacheAdapter,
      configService,
      requestContextService,
    );

    eventLogService.log.mockResolvedValue(undefined);
    tokenService.generateJti.mockReturnValue('jti-uuid');
    tokenService.signAccessToken.mockReturnValue('access-token');
    tokenService.generateOpaqueToken.mockReturnValue('opaque-token');
    tokenService.sha256.mockReturnValue('token-hash');
    configService.get.mockReturnValue(604800);
  });

  it('should return accessToken, refreshToken and staff info on valid TOTP', async () => {
    staffRepo.findOne.mockResolvedValue(mockStaff as any);
    mfaConfigRepo.findByStaffId.mockResolvedValue(mockMfaConfig as any);
    cacheAdapter.exists.mockResolvedValue(false);
    mfaService.verifyTotp.mockResolvedValue(true);
    cacheAdapter.set.mockResolvedValue(undefined);
    sessionService.enforceSessionLimit.mockResolvedValue(undefined);
    refreshTokenRepo.createToken.mockResolvedValue({} as any);
    sessionService.addSession.mockResolvedValue(undefined);
    staffRepo.update.mockResolvedValue(undefined as any);

    const result = await usecase.execute(em, params);

    expect(result).toMatchObject({
      staffId: 'staff-1',
      role: 'admin',
      firstName: 'John',
      lastName: 'Doe',
      accessToken: 'access-token',
      refreshToken: 'opaque-token',
    });
    expect(cacheAdapter.exists).toHaveBeenCalledWith(expect.any(String), AUTH);
    expect(cacheAdapter.set).toHaveBeenCalledWith(
      expect.any(String),
      '1',
      expect.objectContaining({ db: CacheDbType.AUTH }),
    );
  });

  it('should throw UnauthorizedException if staff not found', async () => {
    staffRepo.findOne.mockResolvedValue(null);
    await expect(usecase.execute(em, params)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if MFA not configured', async () => {
    staffRepo.findOne.mockResolvedValue(mockStaff as any);
    mfaConfigRepo.findByStaffId.mockResolvedValue(null);
    await expect(usecase.execute(em, params)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw if TOTP code was already used (anti-replay)', async () => {
    staffRepo.findOne.mockResolvedValue(mockStaff as any);
    mfaConfigRepo.findByStaffId.mockResolvedValue(mockMfaConfig as any);
    cacheAdapter.exists.mockResolvedValue(true);
    await expect(usecase.execute(em, params)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw if TOTP code is invalid', async () => {
    staffRepo.findOne.mockResolvedValue(mockStaff as any);
    mfaConfigRepo.findByStaffId.mockResolvedValue(mockMfaConfig as any);
    cacheAdapter.exists.mockResolvedValue(false);
    mfaService.verifyTotp.mockResolvedValue(false);
    await expect(usecase.execute(em, params)).rejects.toThrow(UnauthorizedException);
  });
});
