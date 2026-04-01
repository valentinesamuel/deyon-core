import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { addDays, subDays } from 'date-fns';
import { createTestingModule, createTestApp } from '../../helpers/app.helper';
import { truncateAllTables, seedPermissionsAndRoles } from '../../helpers/database.helper';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { TokenService } from '../../../src/modules/auth/services/token.service';
import { EncryptionUtility } from '../../../src/shared/utility/encryption/encryption.utility';
import { Staff } from '../../../src/modules/core/entities/staff.entity';
import { MfaConfig } from '../../../src/modules/core/entities/mfaConfig.entity';
import { InviteToken } from '../../../src/modules/core/entities/inviteToken.entity';
import { Role } from '../../../src/modules/core/entities/role.entity';
import { Department } from '../../../src/modules/core/entities/department.entity';
import { API_KEY_HEADER, authenticatedCookies } from './auth.e2e-helper';

const TEST_EMAIL = 'admin@hospital.com';
const TEST_PASSWORD = 'TestPassword1!';
const PLAIN_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

describe('Auth Invite E2E', () => {
  let module: TestingModule;
  let app: INestApplication;
  let dataSource: DataSource;
  let authService: AuthService;
  let tokenService: TokenService;
  let encryptionUtility: EncryptionUtility;
  let roleId: string;
  let departmentId: string;

  beforeAll(async () => {
    module = await createTestingModule();
    app = await createTestApp(module);
    dataSource = module.get(DataSource);
    authService = module.get(AuthService);
    tokenService = module.get(TokenService);
    encryptionUtility = module.get(EncryptionUtility);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
    await seedPermissionsAndRoles(dataSource);

    const role = await dataSource
      .getRepository(Role)
      .findOneOrFail({ where: { alias: 'super_admin' } });
    roleId = role.id;

    const dept = await dataSource
      .getRepository(Department)
      .findOneOrFail({ where: { alias: 'clinical' } });
    departmentId = dept.id;

    // Seed an authenticated admin staff
    const staffRepo = dataSource.getRepository(Staff);
    const passwordHash = await authService.hashPassword(TEST_PASSWORD);
    const admin = await staffRepo.save(
      staffRepo.create({
        firstName: 'Admin',
        lastName: 'User',
        email: TEST_EMAIL,
        phoneNumber: '+2348055500050',
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
      .save(dataSource.getRepository(MfaConfig).create({ staffId: admin.id, encryptedSecret }));
  });

  it('POST /staff/auth/invite (authenticated admin with *:* perm) → 201', async () => {
    const cookies = await authenticatedCookies(app, TEST_EMAIL, TEST_PASSWORD, PLAIN_SECRET);

    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/invite')
      .set(API_KEY_HEADER)
      .set('Cookie', cookies)
      .send({ email: 'newdoc@hospital.com', roleId, departmentId })
      .expect(201);

    expect(res.body.success).toBe(true);
  });

  it('POST /staff/auth/invite without authentication → 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/staff/auth/invite')
      .set(API_KEY_HEADER)
      .send({ email: 'newdoc@hospital.com', roleId, departmentId })
      .expect(401);
  });

  it('POST /staff/auth/invite/accept with valid token → 201, staff created', async () => {
    // Seed an invite token directly
    const plainToken = tokenService.generateOpaqueToken();
    const tokenHash = tokenService.sha256(plainToken);
    await dataSource.getRepository(InviteToken).save(
      dataSource.getRepository(InviteToken).create({
        tokenHash,
        email: 'newstaff@hospital.com',
        roleId,
        isUsed: false,
        expiresAt: addDays(new Date(), 2),
      }),
    );

    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/invite/accept')
      .set(API_KEY_HEADER)
      .send({
        token: plainToken,
        firstName: 'New',
        lastName: 'Staff',
        phoneNumber: '+2348012345678',
        password: 'StrongPass1!',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.result.requiresMfaSetup).toBe(true);
    expect(res.body.result.setupToken).toBeTypeOf('string');
  });

  it('POST /staff/auth/invite/accept with expired token → 400', async () => {
    const plainToken = tokenService.generateOpaqueToken();
    const tokenHash = tokenService.sha256(plainToken);
    await dataSource.getRepository(InviteToken).save(
      dataSource.getRepository(InviteToken).create({
        tokenHash,
        email: 'expired@hospital.com',
        roleId,
        isUsed: false,
        expiresAt: subDays(new Date(), 1),
      }),
    );

    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/auth/invite/accept')
      .set(API_KEY_HEADER)
      .send({
        token: plainToken,
        firstName: 'New',
        lastName: 'Staff',
        phoneNumber: '+2348012345678',
        password: 'StrongPass1!',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});
