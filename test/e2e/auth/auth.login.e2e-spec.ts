import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestingModule, createTestApp } from '../../helpers/app.helper';
import { truncateAllTables } from '../../helpers/database.helper';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { Staff } from '../../../src/modules/core/entities/staff.entity';
import { API_KEY_HEADER } from './auth.e2e-helper';

const TEST_EMAIL = 'login@hospital.com';
const TEST_PASSWORD = 'TestPassword1!';

describe('Auth Login E2E', () => {
  let module: TestingModule;
  let app: INestApplication;
  let dataSource: DataSource;
  let authService: AuthService;

  beforeAll(async () => {
    module = await createTestingModule();
    app = await createTestApp(module);
    dataSource = module.get(DataSource);
    authService = module.get(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);

    const repo = dataSource.getRepository(Staff);
    const passwordHash = await authService.hashPassword(TEST_PASSWORD);
    await repo.save(
      repo.create({
        firstName: 'Login',
        lastName: 'Test',
        email: TEST_EMAIL,
        phoneNumber: '+2348055500010',
        passwordHash,
        isActive: true,
        isApproved: true,
        mfaEnabled: true,
        failedLoginAttempts: 0,
      }),
    );
  });

  it('POST /staff/auth/login with valid credentials → 201, result.requiresMfa=true', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .set(API_KEY_HEADER)
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(201);

    expect(res.body.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.result.requiresMfa).toBe(true);
    expect(res.body.result.mfaToken).toBeTypeOf('string');
  });

  it('POST /staff/auth/login with wrong password → 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .set(API_KEY_HEADER)
      .send({ email: TEST_EMAIL, password: 'WrongPassword!' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('POST /staff/auth/login with non-existent email → 401 (same as wrong password)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .set(API_KEY_HEADER)
      .send({ email: 'nobody@hospital.com', password: TEST_PASSWORD })
      .expect(401);

    expect(res.body.success).toBe(false);
    // Same message for both cases — prevents email enumeration
    expect(res.body.message).toContain('Invalid credentials');
  });

  it('POST /staff/auth/login with missing fields → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .set(API_KEY_HEADER)
      .send({ email: TEST_EMAIL })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('POST /staff/auth/login without API key → 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/staff/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(403);
  });
});
