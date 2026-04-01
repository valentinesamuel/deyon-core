import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { SetupMfaUsecase } from './setupMfa.uc';
import { MfaService } from '../services/mfa.service';
import { MfaConfigRepository } from '@adapters/repositories/mfaConfig.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { RequestContextService } from '@shared/context/requestContext.service';

describe('SetupMfaUsecase', () => {
  let usecase: SetupMfaUsecase;
  let mfaService: ReturnType<typeof mock<MfaService>>;
  let mfaConfigRepo: ReturnType<typeof mock<MfaConfigRepository>>;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  beforeEach(() => {
    mfaService = mock<MfaService>();
    mfaConfigRepo = mock<MfaConfigRepository>();
    staffRepo = mock<StaffRepository>();
    requestContextService = mock<RequestContextService>();
    em = mock<EntityManager>();

    requestContextService.getUserId.mockReturnValue('staff-1');

    usecase = new SetupMfaUsecase(mfaService, mfaConfigRepo, staffRepo, requestContextService);
  });

  it('should return qrCodeDataUrl and otpAuthUrl', async () => {
    staffRepo.findOne.mockResolvedValue({ id: 'staff-1', email: 'user@test.com' } as any);
    mfaService.generateSecret.mockResolvedValue({
      encryptedSecret: 'enc',
      otpAuthUrl: 'otpauth://totp/...',
      qrCodeDataUrl: 'data:image/png;base64,...',
    });
    mfaConfigRepo.saveOrUpdate.mockResolvedValue({} as any);

    const result = await usecase.execute(em, { setupToken: 'tok-1' });

    expect(result).toEqual({
      qrCodeDataUrl: 'data:image/png;base64,...',
      otpAuthUrl: 'otpauth://totp/...',
    });
    expect(mfaConfigRepo.saveOrUpdate).toHaveBeenCalledWith(
      'staff-1',
      expect.objectContaining({ encryptedSecret: 'enc' }),
      em,
    );
  });

  it('should throw UnauthorizedException if staff not found', async () => {
    staffRepo.findOne.mockResolvedValue(null);
    await expect(usecase.execute(em, { setupToken: 'tok-1' })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
