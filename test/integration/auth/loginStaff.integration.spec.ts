import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { createTestingModule } from '../../helpers/app.helper';
import { truncateAllTables } from '../../helpers/database.helper';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { LoginStaffUsecase } from '../../../src/modules/auth/usecases/loginStaff.uc';
import { RedisService } from '../../../src/shared/redis/redis.service';
import { RedisKeys } from '../../../src/shared/redis/redis.constants';
import { Staff } from '../../../src/modules/core/entities/staff.entity';

const TEST_EMAIL = 'teststaff@hospital.com';
const TEST_PASSWORD = 'TestPassword1!';

describe('LoginStaff Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let authService: AuthService;
  let loginUc: LoginStaffUsecase;
  let redisService: RedisService;
  let passwordHash: string;

  beforeAll(async () => {
    module = await createTestingModule();
    dataSource = module.get(DataSource);
    authService = module.get(AuthService);
    loginUc = module.get(LoginStaffUsecase);
    redisService = module.get(RedisService);
    // Compute hash once; argon2 is slow
    passwordHash = await authService.hashPassword(TEST_PASSWORD);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
    // Clear Redis lockout keys
    await redisService.del(RedisKeys.loginAttempts(TEST_EMAIL));
    await redisService.del(RedisKeys.loginLockout(TEST_EMAIL));
  });

  async function seedStaff(overrides: Partial<Staff> = {}) {
    const repo = dataSource.getRepository(Staff);
    const staff = repo.create({
      firstName: 'Test',
      lastName: 'Staff',
      email: TEST_EMAIL,
      passwordHash,
      isActive: true,
      isApproved: true,
      mfaEnabled: false,
      failedLoginAttempts: 0,
      ...overrides,
    });
    return repo.save(staff);
  }

  it('returns requiresMfa=true and mfaToken for valid credentials', async () => {
    await seedStaff();

    const result = await loginUc.execute(dataSource.manager, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(result.requiresMfa).toBe(true);
    expect(result.mfaToken).toBeTypeOf('string');
    expect(result.mfaToken).toHaveLength(64); // 32 random bytes → hex = 64 chars
  });

  it('throws 401 for wrong password', async () => {
    await seedStaff();

    await expect(
      loginUc.execute(dataSource.manager, {
        email: TEST_EMAIL,
        password: 'WrongPassword!',
      }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('throws 401 for non-existent email', async () => {
    await expect(
      loginUc.execute(dataSource.manager, {
        email: 'nobody@hospital.com',
        password: TEST_PASSWORD,
      }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('throws 401 for inactive staff', async () => {
    await seedStaff({ isActive: false });

    await expect(
      loginUc.execute(dataSource.manager, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    ).rejects.toThrow('Account is not active');
  });

  it('throws 401 for unapproved staff', async () => {
    await seedStaff({ isApproved: false });

    await expect(
      loginUc.execute(dataSource.manager, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    ).rejects.toThrow('Account is pending approval');
  });

  it('sets Redis lockout key after 5 failed attempts', async () => {
    await seedStaff();

    // 4 failed attempts — no lockout yet
    for (let i = 0; i < 4; i++) {
      await loginUc
        .execute(dataSource.manager, { email: TEST_EMAIL, password: 'BadPass!' })
        .catch(() => {});
    }

    const lockedBefore = await redisService.exists(RedisKeys.loginLockout(TEST_EMAIL));
    expect(lockedBefore).toBe(false);

    // 5th attempt triggers lockout
    await expect(
      loginUc.execute(dataSource.manager, { email: TEST_EMAIL, password: 'BadPass!' }),
    ).rejects.toThrow('Too many failed attempts');

    const lockedAfter = await redisService.exists(RedisKeys.loginLockout(TEST_EMAIL));
    expect(lockedAfter).toBe(true);
  });
});
