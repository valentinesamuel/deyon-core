import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfirmMfaSetupUsecase } from './confirmMfaSetup.uc';
import { MfaService } from '../services/mfa.service';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { EventLogService } from '../services/eventLog.service';
import { MfaConfigRepository } from '@adapters/repositories/mfaConfig.repository';
import { RefreshTokenRepository } from '@adapters/repositories/refreshToken.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RequestContextService } from '@shared/context/requestContext.service';

const AUTH = { db: CacheDbType.AUTH };

describe('ConfirmMfaSetupUsecase', () => {
  let usecase: ConfirmMfaSetupUsecase;
  let mfaService: ReturnType<typeof mock<MfaService>>;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let sessionService: ReturnType<typeof mock<SessionService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let mfaConfigRepo: ReturnType<typeof mock<MfaConfigRepository>>;
  let refreshTokenRepo: ReturnType<typeof mock<RefreshTokenRepository>>;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;
  let cacheAdapter: ReturnType<typeof mock<CacheAdapter>>;
  let configService: ReturnType<typeof mock<ConfigService>>;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  const params = {
    totpCode: '123456',
    setupToken: 'setup-tok',
  };

  beforeEach(() => {
    mfaService = mock<MfaService>();
    tokenService = mock<TokenService>();
    sessionService = mock<SessionService>();
    eventLogService = mock<EventLogService>();
    mfaConfigRepo = mock<MfaConfigRepository>();
    refreshTokenRepo = mock<RefreshTokenRepository>();
    staffRepo = mock<StaffRepository>();
    cacheAdapter = mock<CacheAdapter>();
    configService = mock<ConfigService>();
    requestContextService = mock<RequestContextService>();
    em = mock<EntityManager>();

    requestContextService.getUserId.mockReturnValue('staff-1');
    requestContextService.getIp.mockReturnValue('127.0.0.1');
    requestContextService.getUserAgent.mockReturnValue('test-agent');

    usecase = new ConfirmMfaSetupUsecase(
      mfaService,
      tokenService,
      sessionService,
      eventLogService,
      mfaConfigRepo,
      refreshTokenRepo,
      staffRepo,
      cacheAdapter,
      configService,
      requestContextService,
    );

    eventLogService.log.mockResolvedValue(undefined);
    tokenService.generateJti.mockReturnValue('jti-1');
    tokenService.signAccessToken.mockReturnValue('access-tok');
    tokenService.generateOpaqueToken.mockReturnValue('opaque-tok');
    tokenService.sha256.mockReturnValue('tok-hash');
    configService.get.mockReturnValue(604800);
    mfaService.generateBackupCodes.mockResolvedValue({
      plainCodes: ['CODE1', 'CODE2'],
      hashedCodes: ['hash1', 'hash2'],
    });
    mfaConfigRepo.saveOrUpdate.mockResolvedValue({} as any);
    staffRepo.update.mockResolvedValue(undefined as any);
    cacheAdapter.del.mockResolvedValue(undefined);
    refreshTokenRepo.createToken.mockResolvedValue({} as any);
    sessionService.addSession.mockResolvedValue(undefined);
  });

  it('should return { accessGranted: true, backupCodes, accessToken, refreshToken }', async () => {
    mfaConfigRepo.findByStaffId.mockResolvedValue({ encryptedSecret: 'enc' } as any);
    mfaService.verifyTotp.mockResolvedValue(true);
    staffRepo.findOne.mockResolvedValue({ id: 'staff-1', role: { alias: 'admin' } } as any);

    const result = await usecase.execute(em, params);

    expect(result).toMatchObject({
      accessGranted: true,
      accessToken: 'access-tok',
      refreshToken: 'opaque-tok',
    });
    expect((result as any).backupCodes).toHaveLength(2);
    expect(cacheAdapter.del).toHaveBeenCalledWith(expect.any(String), AUTH);
  });

  it('should throw if MFA setup not initiated (no config)', async () => {
    mfaConfigRepo.findByStaffId.mockResolvedValue(null);
    await expect(usecase.execute(em, params)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw if TOTP code is invalid', async () => {
    mfaConfigRepo.findByStaffId.mockResolvedValue({ encryptedSecret: 'enc' } as any);
    mfaService.verifyTotp.mockResolvedValue(false);
    await expect(usecase.execute(em, params)).rejects.toThrow(UnauthorizedException);
  });
});
