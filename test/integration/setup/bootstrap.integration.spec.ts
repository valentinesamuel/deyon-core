import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import { createTestingModule } from '../../helpers/app.helper';
import { truncateAllTables, seedPermissionsAndRoles } from '../../helpers/database.helper';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { BootstrapSystemUsecase } from '../../../src/modules/setup/usecases/bootstrapSystem.uc';
import { EncryptionUtility } from '../../../src/shared/utility/encryption/encryption.utility';
import { Staff } from '../../../src/modules/core/entities/staff.entity';
import { MfaConfig } from '../../../src/modules/core/entities/mfaConfig.entity';
import { SystemConfig } from '../../../src/modules/core/entities/systemConfig.entity';

const PLAIN_SECRET = 'JBSWY3DPEHPK3PXP';

describe('BootstrapSystem Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let authService: AuthService;
  let bootstrapUc: BootstrapSystemUsecase;
  let encryptionUtility: EncryptionUtility;
  let testTotp: TOTP;
  let encryptedSecret: string;
  let passwordHash: string;

  beforeAll(async () => {
    module = await createTestingModule();
    dataSource = module.get(DataSource);
    authService = module.get(AuthService);
    bootstrapUc = module.get(BootstrapSystemUsecase);
    encryptionUtility = module.get(EncryptionUtility);

    testTotp = new TOTP({
      crypto: new NobleCryptoPlugin(),
      base32: new ScureBase32Plugin(),
    });

    passwordHash = await authService.hashPassword('TestPassword1!');
    encryptedSecret = encryptionUtility.encrypt(PLAIN_SECRET);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
    await seedPermissionsAndRoles(dataSource);
  });

  async function seedCmo(): Promise<Staff> {
    const staffRepo = dataSource.getRepository(Staff);
    const cmo = await staffRepo.save(
      staffRepo.create({
        firstName: 'Chief',
        lastName: 'Medical',
        email: 'cmo@hospital.com',
        passwordHash,
        isActive: true,
        isApproved: true,
        failedLoginAttempts: 0,
      }),
    );

    const mfaRepo = dataSource.getRepository(MfaConfig);
    await mfaRepo.save(mfaRepo.create({ staffId: cmo.id, encryptedSecret }));

    return cmo;
  }

  it('assigns super_admin role and marks setup_complete=true', async () => {
    const cmo = await seedCmo();
    const totpCode = await (testTotp as any).generate(PLAIN_SECRET);

    const result = await dataSource.manager.transaction(async (em) => {
      return bootstrapUc.execute(em, { staffId: cmo.id, totpCode });
    });

    expect(result.success).toBe(true);
    expect(result.roleAssigned).toBe('super_admin');

    // Staff should have super_admin role
    const updatedStaff = await dataSource.getRepository(Staff).findOne({
      where: { id: cmo.id },
      relations: ['role'],
    });
    expect(updatedStaff?.role?.alias).toBe('super_admin');

    // system_config should be updated
    const config = await dataSource
      .getRepository(SystemConfig)
      .findOne({ where: { key: 'setup_complete' } });
    expect((config?.value as any)?.completed).toBe(true);
  });

  it('throws ConflictException if already bootstrapped', async () => {
    const cmo = await seedCmo();

    // Mark as already complete
    await dataSource
      .getRepository(SystemConfig)
      .update(
        { key: 'setup_complete' },
        { value: { completed: true, completedAt: new Date().toISOString(), completedBy: cmo.id } },
      );

    const totpCode = await (testTotp as any).generate(PLAIN_SECRET);

    await expect(
      dataSource.manager.transaction(async (em) => {
        return bootstrapUc.execute(em, { staffId: cmo.id, totpCode });
      }),
    ).rejects.toThrow('already been completed');
  });

  it('throws 401 for invalid TOTP code', async () => {
    const cmo = await seedCmo();

    await expect(
      dataSource.manager.transaction(async (em) => {
        return bootstrapUc.execute(em, { staffId: cmo.id, totpCode: '000000' });
      }),
    ).rejects.toThrow('Invalid verification code');
  });

  it('throws 401 when MFA not configured', async () => {
    // Seed staff without MFA config
    const staffRepo = dataSource.getRepository(Staff);
    const staff = await staffRepo.save(
      staffRepo.create({
        firstName: 'No',
        lastName: 'Mfa',
        email: 'nomfa@hospital.com',
        passwordHash,
        isActive: true,
        isApproved: true,
        failedLoginAttempts: 0,
      }),
    );

    const totpCode = await (testTotp as any).generate(PLAIN_SECRET);

    await expect(
      dataSource.manager.transaction(async (em) => {
        return bootstrapUc.execute(em, { staffId: staff.id, totpCode });
      }),
    ).rejects.toThrow('MFA not configured');
  });
});
