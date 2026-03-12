import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { SetupMfaUsecase } from './setupMfa.uc';
import { MfaService } from '../services/mfa.service';
import { MfaConfigRepository } from '@adapters/repositories/mfaConfig.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';

describe('SetupMfaUsecase', () => {
  let usecase: SetupMfaUsecase;
  let mfaService: ReturnType<typeof mock<MfaService>>;
  let mfaConfigRepo: ReturnType<typeof mock<MfaConfigRepository>>;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  beforeEach(() => {
    mfaService = mock<MfaService>();
    mfaConfigRepo = mock<MfaConfigRepository>();
    staffRepo = mock<StaffRepository>();
    em = mock<EntityManager>();

    usecase = new SetupMfaUsecase(mfaService, mfaConfigRepo, staffRepo);
  });

  it('should return qrCodeDataUrl and otpauthUrl', async () => {
    staffRepo.findOne.mockResolvedValue({ id: 'staff-1', email: 'user@test.com' } as any);
    mfaService.generateSecret.mockResolvedValue({
      encryptedSecret: 'enc',
      otpauthUrl: 'otpauth://totp/...',
      qrCodeDataUrl: 'data:image/png;base64,...',
    });
    mfaConfigRepo.saveOrUpdate.mockResolvedValue({} as any);

    const result = await usecase.execute(em, { mfaStaffId: 'staff-1', setupToken: 'tok-1' });

    expect(result).toEqual({
      qrCodeDataUrl: 'data:image/png;base64,...',
      otpauthUrl: 'otpauth://totp/...',
    });
    expect(mfaConfigRepo.saveOrUpdate).toHaveBeenCalledWith(
      'staff-1',
      expect.objectContaining({ encryptedSecret: 'enc' }),
    );
  });

  it('should throw UnauthorizedException if staff not found', async () => {
    staffRepo.findOne.mockResolvedValue(null);
    await expect(
      usecase.execute(em, { mfaStaffId: 'nobody', setupToken: 'tok-1' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
