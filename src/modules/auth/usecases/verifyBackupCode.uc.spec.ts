import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VerifyBackupCodeUsecase } from './verifyBackupCode.uc';
import { MfaService } from '../services/mfa.service';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { EventLogService } from '../services/eventLog.service';
import { RefreshTokenRepository } from '@adapters/repositories/refreshToken.repository';
import { MfaConfigRepository } from '@adapters/repositories/mfaConfig.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { RequestContextService } from '@shared/context/requestContext.service';

describe('VerifyBackupCodeUsecase', () => {
  let usecase: VerifyBackupCodeUsecase;
  let mfaService: ReturnType<typeof mock<MfaService>>;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let sessionService: ReturnType<typeof mock<SessionService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let refreshTokenRepo: ReturnType<typeof mock<RefreshTokenRepository>>;
  let mfaConfigRepo: ReturnType<typeof mock<MfaConfigRepository>>;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;
  let configService: ReturnType<typeof mock<ConfigService>>;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  const params = {
    mfaToken: 'mfa-token-1',
    backupCode: 'ABCDE12345',
  };

  const mockStaff = { id: 'staff-1', role: { alias: 'admin' } };
  const mockMfaConfig = {
    backupCodeHashes: JSON.stringify(['hash0', 'hash1', 'hash2']),
    usedBackupCodes: JSON.stringify([]),
  };

  beforeEach(() => {
    mfaService = mock<MfaService>();
    tokenService = mock<TokenService>();
    sessionService = mock<SessionService>();
    eventLogService = mock<EventLogService>();
    refreshTokenRepo = mock<RefreshTokenRepository>();
    mfaConfigRepo = mock<MfaConfigRepository>();
    staffRepo = mock<StaffRepository>();
    configService = mock<ConfigService>();
    requestContextService = mock<RequestContextService>();
    em = mock<EntityManager>();

    requestContextService.getUserId.mockReturnValue('staff-1');
    requestContextService.getIp.mockReturnValue('127.0.0.1');
    requestContextService.getUserAgent.mockReturnValue('test-agent');

    usecase = new VerifyBackupCodeUsecase(
      mfaService,
      tokenService,
      sessionService,
      eventLogService,
      refreshTokenRepo,
      mfaConfigRepo,
      staffRepo,
      configService,
      requestContextService,
    );

    eventLogService.log.mockResolvedValue(undefined);
    tokenService.generateJti.mockReturnValue('jti-1');
    tokenService.signAccessToken.mockReturnValue('access-tok');
    tokenService.generateOpaqueToken.mockReturnValue('opaque-tok');
    tokenService.sha256.mockReturnValue('tok-hash');
    configService.get.mockReturnValue(604800);
    sessionService.enforceSessionLimit.mockResolvedValue(undefined);
    sessionService.addSession.mockResolvedValue(undefined);
    refreshTokenRepo.createToken.mockResolvedValue({} as any);
    mfaConfigRepo.saveOrUpdate.mockResolvedValue({} as any);
    staffRepo.update.mockResolvedValue(undefined as any);
  });

  it('should return accessToken, refreshToken, staffId on valid backup code', async () => {
    staffRepo.findOne.mockResolvedValue(mockStaff as any);
    mfaConfigRepo.findByStaffId.mockResolvedValue(mockMfaConfig as any);
    mfaService.verifyBackupCode.mockResolvedValue(1);

    const result = await usecase.execute(em, params);

    expect(result).toMatchObject({
      staffId: 'staff-1',
      accessToken: 'access-tok',
      refreshToken: 'opaque-tok',
    });
    expect(mfaConfigRepo.saveOrUpdate).toHaveBeenCalled();
  });

  it('should throw if staff not found', async () => {
    staffRepo.findOne.mockResolvedValue(null);
    await expect(usecase.execute(em, params)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw if backup codes not configured', async () => {
    staffRepo.findOne.mockResolvedValue(mockStaff as any);
    mfaConfigRepo.findByStaffId.mockResolvedValue(null);
    await expect(usecase.execute(em, params)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw if backup code is invalid', async () => {
    staffRepo.findOne.mockResolvedValue(mockStaff as any);
    mfaConfigRepo.findByStaffId.mockResolvedValue(mockMfaConfig as any);
    mfaService.verifyBackupCode.mockResolvedValue(-1);

    await expect(usecase.execute(em, params)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw if backup code already used', async () => {
    staffRepo.findOne.mockResolvedValue(mockStaff as any);
    mfaConfigRepo.findByStaffId.mockResolvedValue({
      ...mockMfaConfig,
      usedBackupCodes: JSON.stringify([1]),
    } as any);
    mfaService.verifyBackupCode.mockResolvedValue(1);

    await expect(usecase.execute(em, params)).rejects.toThrow(UnauthorizedException);
  });
});
