import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import { createTestingModule } from '../../helpers/app.helper';
import { truncateAllTables } from '../../helpers/database.helper';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { VerifyMfaUsecase } from '../../../src/modules/auth/usecases/verifyMfa.uc';
import { EncryptionUtility } from '../../../src/shared/utility/encryption/encryption.utility';
import { RequestContextService } from '../../../src/shared/context/requestContext.service';
import { Staff } from '../../../src/modules/core/entities/staff.entity';
import { MfaConfig } from '../../../src/modules/core/entities/mfaConfig.entity';
import { RefreshToken } from '../../../src/modules/core/entities/refreshToken.entity';

const PLAIN_SECRET = 'JBSWY3DPEHPK3PXP';

describe('VerifyMfa Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let authService: AuthService;
  let verifyMfaUc: VerifyMfaUsecase;
  let encryptionUtility: EncryptionUtility;
  let requestContextService: RequestContextService;
  let testTotp: TOTP;
  let encryptedSecret: string;
  let passwordHash: string;

  beforeAll(async () => {
    module = await createTestingModule();
    dataSource = module.get(DataSource);
    authService = module.get(AuthService);
    verifyMfaUc = module.get(VerifyMfaUsecase);
    encryptionUtility = module.get(EncryptionUtility);
    requestContextService = module.get(RequestContextService);

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
  });

  async function seedStaffWithMfa() {
    const staffRepo = dataSource.getRepository(Staff);
    const staff = staffRepo.create({
      firstName: 'Test',
      lastName: 'Staff',
      email: 'mfa@hospital.com',
      passwordHash,
      isActive: true,
      isApproved: true,
      mfaEnabled: true,
      failedLoginAttempts: 0,
    });
    const saved = await staffRepo.save(staff);

    const mfaRepo = dataSource.getRepository(MfaConfig);
    await mfaRepo.save(mfaRepo.create({ staffId: saved.id, encryptedSecret }));

    return saved;
  }

  it('verifies TOTP and issues tokens', async () => {
    const staff = await seedStaffWithMfa();

    // Set staff ID in context (normally done by MfaTokenGuard)
    requestContextService.setUserId(staff.id);

    const mfaToken = await authService.issueEphemeralMfaToken(staff.id);
    const totpCode = await (testTotp as any).generate(PLAIN_SECRET);

    const result = await verifyMfaUc.execute(dataSource.manager, { mfaToken, totpCode });

    expect(result.staffId).toBe(staff.id);
    expect(result.firstName).toBe('Test');
    expect(result.lastName).toBe('Staff');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();

    // Refresh token row should be in DB
    const tokens = await dataSource.getRepository(RefreshToken).find({
      where: { staffId: staff.id },
    });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].isRevoked).toBe(false);
  });

  it('throws 401 for invalid TOTP code', async () => {
    const staff = await seedStaffWithMfa();
    requestContextService.setUserId(staff.id);

    await expect(
      verifyMfaUc.execute(dataSource.manager, {
        mfaToken: 'any-token',
        totpCode: '000000',
      }),
    ).rejects.toThrow();
  });

  it('throws 401 when MFA config not found', async () => {
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

    requestContextService.setUserId(staff.id);
    const mfaToken = await authService.issueEphemeralMfaToken(staff.id);
    const totpCode = await (testTotp as any).generate(PLAIN_SECRET);

    await expect(verifyMfaUc.execute(dataSource.manager, { mfaToken, totpCode })).rejects.toThrow(
      'MFA not configured',
    );
  });

  it('stores session in Redis after successful verification', async () => {
    const staff = await seedStaffWithMfa();
    requestContextService.setUserId(staff.id);

    const mfaToken = await authService.issueEphemeralMfaToken(staff.id);
    const totpCode = await (testTotp as any).generate(PLAIN_SECRET);

    await verifyMfaUc.execute(dataSource.manager, { mfaToken, totpCode });

    const tokens = await dataSource.getRepository(RefreshToken).find({
      where: { staffId: staff.id },
    });
    expect(tokens.length).toBeGreaterThan(0);
  });
});
