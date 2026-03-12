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
import { RedisService } from '@shared/redis/redis.service';

describe('VerifyMfaUsecase', () => {
  let usecase: VerifyMfaUsecase;
  let mfaService: ReturnType<typeof mock<MfaService>>;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let sessionService: ReturnType<typeof mock<SessionService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let refreshTokenRepo: ReturnType<typeof mock<RefreshTokenRepository>>;
  let mfaConfigRepo: ReturnType<typeof mock<MfaConfigRepository>>;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;
  let redisService: ReturnType<typeof mock<RedisService>>;
  let configService: ReturnType<typeof mock<ConfigService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  const mockStaff = { id: 'staff-1', firstName: 'John', lastName: 'Doe', role: { alias: 'admin' } };
  const mockMfaConfig = { encryptedSecret: 'enc-secret' };
  const mockRes = { cookie: vi.fn() } as any;

  const params = {
    mfaStaffId: 'staff-1',
    mfaToken: 'mfa-token-1',
    totpCode: '123456',
    res: mockRes,
    ipAddress: '127.0.0.1',
    userAgent: 'test',
  };

  beforeEach(() => {
    mfaService = mock<MfaService>();
    tokenService = mock<TokenService>();
    sessionService = mock<SessionService>();
    eventLogService = mock<EventLogService>();
    refreshTokenRepo = mock<RefreshTokenRepository>();
    mfaConfigRepo = mock<MfaConfigRepository>();
    staffRepo = mock<StaffRepository>();
    redisService = mock<RedisService>();
    configService = mock<ConfigService>();
    em = mock<EntityManager>();

    usecase = new VerifyMfaUsecase(
      mfaService,
      tokenService,
      sessionService,
      eventLogService,
      refreshTokenRepo,
      mfaConfigRepo,
      staffRepo,
      redisService,
      configService,
    );

    eventLogService.log.mockResolvedValue(undefined);
    tokenService.generateJti.mockReturnValue('jti-uuid');
    tokenService.signAccessToken.mockReturnValue('access-token');
    tokenService.generateOpaqueToken.mockReturnValue('opaque-token');
    tokenService.sha256.mockReturnValue('token-hash');
    tokenService.setAuthCookies.mockReturnValue(undefined);
    configService.get.mockReturnValue(604800);
  });

  it('should return staffId, role, firstName, lastName on valid TOTP', async () => {
    staffRepo.findOne.mockResolvedValue(mockStaff as any);
    mfaConfigRepo.findByStaffId.mockResolvedValue(mockMfaConfig as any);
    redisService.exists.mockResolvedValue(false); // not used before
    mfaService.verifyTotp.mockResolvedValue(true);
    redisService.set.mockResolvedValue(undefined);
    sessionService.enforceSessionLimit.mockResolvedValue(undefined);
    refreshTokenRepo.createToken.mockResolvedValue({} as any);
    sessionService.addSession.mockResolvedValue(undefined);
    staffRepo.update.mockResolvedValue(undefined as any);

    const result = await usecase.execute(em, params);

    expect(result).toEqual({
      staffId: 'staff-1',
      role: 'admin',
      firstName: 'John',
      lastName: 'Doe',
    });
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
    redisService.exists.mockResolvedValue(true); // already used
    await expect(usecase.execute(em, params)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw if TOTP code is invalid', async () => {
    staffRepo.findOne.mockResolvedValue(mockStaff as any);
    mfaConfigRepo.findByStaffId.mockResolvedValue(mockMfaConfig as any);
    redisService.exists.mockResolvedValue(false);
    mfaService.verifyTotp.mockResolvedValue(false);
    await expect(usecase.execute(em, params)).rejects.toThrow(UnauthorizedException);
  });
});
