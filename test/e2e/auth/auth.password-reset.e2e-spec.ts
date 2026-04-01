import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestingModule, createTestApp } from '../../helpers/app.helper';
import { truncateAllTables } from '../../helpers/database.helper';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { TokenService } from '../../../src/modules/auth/services/token.service';
import { CacheAdapter } from '../../../src/adapters/cache/cache.adapter';
import { CacheDbType } from '../../../src/adapters/cache/providers/redis.provider';
import { RedisKeys, RedisTTL } from '../../../src/adapters/cache/cache.constants';
import { Staff } from '../../../src/modules/core/entities/staff.entity';
import { API_KEY_HEADER } from './auth.e2e-helper';

const TEST_EMAIL = 'resetpw@hospital.com';

describe('Auth Password Reset E2E', () => {
  let module: TestingModule;
  let app: INestApplication;
  let dataSource: DataSource;
  let authService: AuthService;
  let tokenService: TokenService;
  let cacheAdapter: CacheAdapter;
  let staffId: string;

  beforeAll(async () => {
    module = await createTestingModule();
    app = await createTestApp(module);
    dataSource = module.get(DataSource);
    authService = module.get(AuthService);
    tokenService = module.get(TokenService);
    cacheAdapter = module.get(CacheAdapter);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
    // Clear rate-limit key
    await cacheAdapter.del(RedisKeys.pwResetRate(TEST_EMAIL), { db: CacheDbType.AUTH });

    const repo = dataSource.getRepository(Staff);
    const passwordHash = await authService.hashPassword('OldPassword1!');
    const staff = await repo.save(
      repo.create({
        firstName: 'Reset',
        lastName: 'Test',
        email: TEST_EMAIL,
        phoneNumber: '+2348055500001',
        passwordHash,
        isActive: true,
        isApproved: true,
        failedLoginAttempts: 0,
      }),
    );
    staffId = staff.id;
  });

  async function storePwResetToken(): Promise<string> {
    const plainToken = tokenService.generateOpaqueToken();
    const hash = tokenService.sha256(plainToken);
    await cacheAdapter.set(
      RedisKeys.pwReset(hash),
      { staffId },
      { db: CacheDbType.AUTH, ttl: RedisTTL.pwReset },
    );
    return plainToken;
  }

  it('POST /staff/auth/forgot-password → 201 with generic message (valid email)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/forgot-password')
      .set(API_KEY_HEADER)
      .send({ email: TEST_EMAIL })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.result.message).toContain('reset link');
  });

  it('POST /staff/auth/forgot-password → 201 with same message for non-existent email', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/forgot-password')
      .set(API_KEY_HEADER)
      .send({ email: 'nobody@hospital.com' })
      .expect(201);

    // Same message — no email enumeration
    expect(res.body.result.message).toContain('reset link');
  });

  it('POST /staff/auth/reset-password with valid token → 201', async () => {
    const plainToken = await storePwResetToken();

    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/reset-password')
      .set(API_KEY_HEADER)
      .send({ token: plainToken, newPassword: 'NewPassword2@Strong' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.result.message).toContain('Password reset successfully');
  });

  it('POST /staff/auth/reset-password with expired/invalid token → 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/reset-password')
      .set(API_KEY_HEADER)
      .send({ token: 'invalid-token'.repeat(5), newPassword: 'NewPassword2@Strong' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('POST /staff/auth/reset-password with weak password → 400', async () => {
    const plainToken = await storePwResetToken();

    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/reset-password')
      .set(API_KEY_HEADER)
      .send({ token: plainToken, newPassword: 'weak' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});
