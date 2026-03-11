import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestingModule, createTestApp } from '../../helpers/app.helper';
import { truncateAllTables, seedPermissionsAndRoles } from '../../helpers/database.helper';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { EncryptionUtility } from '../../../src/shared/utility/encryption/encryption.utility';
import { Staff } from '../../../src/modules/core/entities/staff.entity';
import { MfaConfig } from '../../../src/modules/core/entities/mfaConfig.entity';
import { Role } from '../../../src/modules/core/entities/role.entity';
import { API_KEY_HEADER, authenticatedCookies } from '../auth/auth.e2e-helper';

const TEST_EMAIL = 'roleadmin@hospital.com';
const TEST_PASSWORD = 'TestPassword1!';
const PLAIN_SECRET = 'JBSWY3DPEHPK3PXP';

describe('Role Create E2E', () => {
  let module: TestingModule;
  let app: INestApplication;
  let dataSource: DataSource;
  let authService: AuthService;
  let encryptionUtility: EncryptionUtility;
  let cookies: string;
  let roleId: string;

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
    await seedPermissionsAndRoles(dataSource);

    // Seed super_admin staff
    const role = await dataSource
      .getRepository(Role)
      .findOneOrFail({ where: { alias: 'super_admin' } });
    roleId = role.id;

    const staffRepo = dataSource.getRepository(Staff);
    const passwordHash = await authService.hashPassword(TEST_PASSWORD);
    const staff = await staffRepo.save(
      staffRepo.create({
        firstName: 'Role',
        lastName: 'Admin',
        email: TEST_EMAIL,
        passwordHash,
        isActive: true,
        isApproved: true,
        mfaEnabled: true,
        failedLoginAttempts: 0,
        roleId,
      }),
    );

    const encryptedSecret = encryptionUtility.encrypt(PLAIN_SECRET);
    await dataSource
      .getRepository(MfaConfig)
      .save(dataSource.getRepository(MfaConfig).create({ staffId: staff.id, encryptedSecret }));

    cookies = await authenticatedCookies(app, TEST_EMAIL, TEST_PASSWORD, PLAIN_SECRET);
  });

  const createRole = (name: string, permissions: string[], cookieOverride?: string) =>
    request(app.getHttpServer())
      .post('/api/v1/role')
      .set(API_KEY_HEADER)
      .set('Cookie', cookieOverride ?? cookies)
      .send({ name, permissions });

  it('POST /role (admin with *:* perm) → 201 with role object', async () => {
    const res = await createRole('Nurse', ['staff:read']).expect(201);

    expect(res.body.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.result.name).toBe('Nurse');
    expect(res.body.result.alias).toBe('nurse');
    expect(res.body.result.permissions).toHaveLength(1);
    expect(res.body.result.permissions[0].code).toBe('staff:read');
  });

  it('POST /role not authenticated → 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/role')
      .set(API_KEY_HEADER)
      .send({ name: 'Nurse', permissions: ['staff:read'] })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('POST /role missing name → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/role')
      .set(API_KEY_HEADER)
      .set('Cookie', cookies)
      .send({ permissions: ['staff:read'] })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('POST /role missing permissions → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/role')
      .set(API_KEY_HEADER)
      .set('Cookie', cookies)
      .send({ name: 'Nurse' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('POST /role duplicate name → 409', async () => {
    await createRole('Doctor', ['staff:read']).expect(201);

    const res = await createRole('Doctor', ['staff:read']).expect(409);
    expect(res.body.success).toBe(false);
  });
});
