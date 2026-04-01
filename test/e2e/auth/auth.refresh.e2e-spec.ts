import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestingModule, createTestApp } from '../../helpers/app.helper';
import { truncateAllTables } from '../../helpers/database.helper';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { EncryptionUtility } from '../../../src/shared/utility/encryption/encryption.utility';
import { Staff } from '../../../src/modules/core/entities/staff.entity';
import { MfaConfig } from '../../../src/modules/core/entities/mfaConfig.entity';
import { API_KEY_HEADER, authenticatedCookies } from './auth.e2e-helper';

const TEST_EMAIL = 'refresh@hospital.com';
const TEST_PASSWORD = 'TestPassword1!';
const PLAIN_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

describe('Auth Refresh Token E2E', () => {
  let module: TestingModule;
  let app: INestApplication;
  let dataSource: DataSource;
  let authService: AuthService;
  let encryptionUtility: EncryptionUtility;

  beforeAll(async () => {
    module = await createTestingModule();
    app = await createTestApp(module);
    dataSource = module.get(DataSource);
    authService = module.get(AuthService);
    encryptionUtility = module.get(EncryptionUtility);
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
        firstName: 'Refresh',
        lastName: 'Test',
        email: TEST_EMAIL,
        phoneNumber: '+2348055500030',
        passwordHash,
        isActive: true,
        isApproved: true,
        mfaEnabled: true,
        failedLoginAttempts: 0,
      }),
    );

    const encryptedSecret = encryptionUtility.encrypt(PLAIN_SECRET);
    await dataSource
      .getRepository(MfaConfig)
      .save(dataSource.getRepository(MfaConfig).create({ staffId: staff.id, encryptedSecret }));
  });

  it('POST /staff/auth/refresh with valid refresh cookie → 200, new cookies issued', async () => {
    const cookies = await authenticatedCookies(app, TEST_EMAIL, TEST_PASSWORD, PLAIN_SECRET);

    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/refresh')
      .set(API_KEY_HEADER)
      .set('Cookie', cookies)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.result.refreshed).toBe(true);

    // New cookies should be set
    const newCookies = res.headers['set-cookie'];
    expect(newCookies).toBeDefined();
  });

  it('POST /staff/auth/refresh with no cookie → 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/refresh')
      .set(API_KEY_HEADER)
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('POST /staff/auth/refresh with invalid refresh cookie → 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/refresh')
      .set(API_KEY_HEADER)
      .set('Cookie', 'refresh_token=invalidtoken')
      .expect(401);

    expect(res.body.success).toBe(false);
  });
});
