import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestingModule, createTestApp } from '../../helpers/app.helper';
import { truncateAllTables, seedPermissionsAndRoles } from '../../helpers/database.helper';
import { generateTotpCode, extractCookies, API_KEY_HEADER } from '../auth/auth.e2e-helper';

describe('Setup Bootstrap E2E', () => {
  let module: TestingModule;
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    module = await createTestingModule();
    app = await createTestApp(module);
    dataSource = module.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
    await seedPermissionsAndRoles(dataSource);
  });

  const registerCmo = (overrides = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/setup/register')
      .set(API_KEY_HEADER)
      .send({
        firstName: 'Chief',
        lastName: 'Medical',
        email: 'cmo@hospital.com',
        phoneNumber: '+2348012345678',
        password: 'TestPassword1!',
        ...overrides,
      });

  it('POST /setup/register → 201 with requiresMfaSetup and setupToken', async () => {
    const res = await registerCmo().expect(201);

    expect(res.body.statusCode).toBe(201);
    expect(res.body.result.requiresMfaSetup).toBe(true);
    expect(res.body.result.setupToken).toBeTypeOf('string');
  });

  it('GET /setup/status → { completed: false } before bootstrap', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/setup/status')
      .set(API_KEY_HEADER)
      .expect(200);

    expect(res.body.result.completed).toBe(false);
  });

  it('full bootstrap flow → status becomes completed:true', async () => {
    // Step 1: Register CMO
    const regRes = await registerCmo().expect(201);
    const setupToken = regRes.body.result.setupToken;

    // Step 2: Init MFA setup
    const setupRes = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/mfa/setup')
      .set(API_KEY_HEADER)
      .send({ setupToken })
      .expect(201);

    const otpauthUrl = setupRes.body.result.otpAuthUrl as string;
    // Extract plain secret from otpauth URL: otpauth://totp/...?secret=SECRET&...
    const secretMatch = otpauthUrl.match(/secret=([^&]+)/);
    expect(secretMatch).not.toBeNull();
    const plainSecret = decodeURIComponent(secretMatch![1]);

    // Step 3: Confirm MFA setup → get cookies
    const totpForConfirm = await generateTotpCode(plainSecret);
    const confirmRes = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/mfa/setup/confirm')
      .set(API_KEY_HEADER)
      .send({ setupToken, totpCode: totpForConfirm })
      .expect(201);

    const cookies = extractCookies(confirmRes);
    expect(cookies).toContain('access_token');

    // Step 4: Bootstrap (authenticated, valid TOTP)
    const totpForBootstrap = await generateTotpCode(plainSecret);
    const bootstrapRes = await request(app.getHttpServer())
      .post('/api/v1/setup/bootstrap')
      .set(API_KEY_HEADER)
      .set('Cookie', cookies)
      .send({ totpCode: totpForBootstrap })
      .expect(201);

    expect(bootstrapRes.body.result.success).toBe(true);

    // Step 5: Status should now be complete
    const statusRes = await request(app.getHttpServer())
      .get('/api/v1/setup/status')
      .set(API_KEY_HEADER)
      .expect(200);

    expect(statusRes.body.result.completed).toBe(true);
  });

  it('POST /setup/register returns 409 if staff already exist', async () => {
    await registerCmo().expect(201);
    // Second registration attempt
    const res = await registerCmo({ email: 'cmo2@hospital.com' });
    expect(res.status).toBe(409);
  });

  it('POST /setup/register returns 400 for missing required fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/setup/register')
      .set(API_KEY_HEADER)
      .send({ firstName: 'Only' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});
