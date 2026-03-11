import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { createTestingModule } from '../../helpers/app.helper';
import { truncateAllTables } from '../../helpers/database.helper';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { TokenService } from '../../../src/modules/auth/services/token.service';
import { ResetPasswordUsecase } from '../../../src/modules/auth/usecases/resetPassword.uc';
import { RedisService } from '../../../src/shared/redis/redis.service';
import { RedisKeys, RedisTTL } from '../../../src/shared/redis/redis.constants';
import { Staff } from '../../../src/modules/core/entities/staff.entity';

const TEST_EMAIL = 'resetpw@hospital.com';

describe('ResetPassword Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let authService: AuthService;
  let tokenService: TokenService;
  let resetPwUc: ResetPasswordUsecase;
  let redisService: RedisService;
  let passwordHash: string;

  beforeAll(async () => {
    module = await createTestingModule();
    dataSource = module.get(DataSource);
    authService = module.get(AuthService);
    tokenService = module.get(TokenService);
    resetPwUc = module.get(ResetPasswordUsecase);
    redisService = module.get(RedisService);
    passwordHash = await authService.hashPassword('OldPassword1!');
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
  });

  async function seedStaff() {
    const repo = dataSource.getRepository(Staff);
    return repo.save(
      repo.create({
        firstName: 'Reset',
        lastName: 'Test',
        email: TEST_EMAIL,
        passwordHash,
        isActive: true,
        isApproved: true,
        failedLoginAttempts: 0,
      }),
    );
  }

  async function storeResetToken(staffId: string): Promise<string> {
    const plainToken = tokenService.generateOpaqueToken();
    const hash = tokenService.sha256(plainToken);
    await redisService.setJson(RedisKeys.pwReset(hash), { staffId }, RedisTTL.pwReset);
    return plainToken;
  }

  it('updates password hash and removes reset token from Redis', async () => {
    const staff = await seedStaff();
    const plainToken = await storeResetToken(staff.id);

    const result = await resetPwUc.execute(dataSource.manager, {
      token: plainToken,
      newPassword: 'NewPassword2!',
    });

    expect(result.message).toContain('Password reset successfully');

    // Redis token should be gone
    const hash = tokenService.sha256(plainToken);
    const remaining = await redisService.getJson(RedisKeys.pwReset(hash));
    expect(remaining).toBeNull();

    // New password should be verifiable
    const updated = await dataSource.getRepository(Staff).findOne({
      where: { id: staff.id },
      select: ['id', 'passwordHash'],
    });
    const isValid = await authService.verifyPassword(updated!.passwordHash, 'NewPassword2!');
    expect(isValid).toBe(true);
  });

  it('throws 401 for expired / invalid reset token', async () => {
    await seedStaff();

    await expect(
      resetPwUc.execute(dataSource.manager, {
        token: 'invalidtoken'.repeat(5),
        newPassword: 'NewPassword2!',
      }),
    ).rejects.toThrow('Invalid or expired reset token');
  });
});
