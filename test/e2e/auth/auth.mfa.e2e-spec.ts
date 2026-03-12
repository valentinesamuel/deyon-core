import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestingModule, createTestApp } from '../../helpers/app.helper';
import { truncateAllTables } from '../../helpers/database.helper';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { EncryptionUtility } from '../../../src/shared/utility/encryption/encryption.utility';
import { Staff } from '../../../src/modules/core/entities/staff.entity';
import { MfaConfig } from '../../../src/modules/core/entities/mfaConfig.entity';
import { API_KEY_HEADER, doLogin, generateTotpCode, extractCookies } from './auth.e2e-helper';

const TEST_EMAIL = 'mfa@hospital.com';
const TEST_PASSWORD = 'TestPassword1!';
const PLAIN_SECRET = 'JBSWY3DPEHPK3PXP';

describe('Auth MFA E2E', () => {
  let module: TestingModule;
  let app: INestApplication;
  let dataSource: DataSource;
  let authService: AuthService;
  let encryptionUtility: EncryptionUtility;
  let encryptedSecret: string;
  let staffId: string;

  beforeAll(async () => {
    module = await createTestingModule();
    app = await createTestApp(module);
    dataSource = module.get(DataSource);
    authService = module.get(AuthService);
    encryptionUtility = module.get(EncryptionUtility);
    encryptedSecret = encryptionUtility.encrypt(PLAIN_SECRET);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);

    const staffRepo = dataSource.getRepository(Staff);
    const passwordHash = await authService.hashPassword(TEST_PASSWORD);
    const staff = await staffRepo.save(
      staffRepo.create({
        firstName: 'Mfa',
        lastName: 'Test',
        email: TEST_EMAIL,
        passwordHash,
        isActive: true,
        isApproved: true,
        mfaEnabled: true,
        failedLoginAttempts: 0,
      }),
    );
    staffId = staff.id;

    await dataSource
      .getRepository(MfaConfig)
      .save(dataSource.getRepository(MfaConfig).create({ staffId, encryptedSecret }));
  });

  it('POST /staff/auth/login/mfa-verify with valid TOTP → 201, Set-Cookie headers', async () => {
    const mfaToken = await doLogin(app, TEST_EMAIL, TEST_PASSWORD);
    const totpCode = await generateTotpCode(PLAIN_SECRET);

    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/login/mfa-verify')
      .set(API_KEY_HEADER)
      .send({ mfaToken, totpCode })
      .expect(201);

    expect(res.body.success).toBe(true);

    const cookies = extractCookies(res);
    expect(cookies).toContain('access_token');
    expect(cookies).toContain('refresh_token');
  });

  it('POST /staff/auth/login/mfa-verify with wrong TOTP → 401', async () => {
    const mfaToken = await doLogin(app, TEST_EMAIL, TEST_PASSWORD);

    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/login/mfa-verify')
      .set(API_KEY_HEADER)
      .send({ mfaToken, totpCode: '000000' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('POST /staff/auth/login/mfa-verify without mfaToken → 401', async () => {
    const totpCode = await generateTotpCode(PLAIN_SECRET);

    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/login/mfa-verify')
      .set(API_KEY_HEADER)
      .send({ totpCode })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('POST /staff/auth/login/mfa-verify with expired/invalid mfaToken → 401', async () => {
    const totpCode = await generateTotpCode(PLAIN_SECRET);

    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/login/mfa-verify')
      .set(API_KEY_HEADER)
      .send({ mfaToken: 'invalidtoken'.repeat(5), totpCode })
      .expect(401);

    expect(res.body.success).toBe(false);
  });
});
