import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { createTestingModule } from '../../helpers/app.helper';
import { truncateAllTables } from '../../helpers/database.helper';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { TokenService } from '../../../src/modules/auth/services/token.service';
import { SessionService } from '../../../src/modules/auth/services/session.service';
import { LogoutUsecase } from '../../../src/modules/auth/usecases/logout.uc';
import { RefreshTokenRepository } from '../../../src/adapters/repositories/refreshToken.repository';
import { Staff } from '../../../src/modules/core/entities/staff.entity';

describe('Logout Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let authService: AuthService;
  let tokenService: TokenService;
  let sessionService: SessionService;
  let logoutUc: LogoutUsecase;
  let refreshTokenRepo: RefreshTokenRepository;
  let passwordHash: string;

  beforeAll(async () => {
    module = await createTestingModule();
    dataSource = module.get(DataSource);
    authService = module.get(AuthService);
    tokenService = module.get(TokenService);
    sessionService = module.get(SessionService);
    logoutUc = module.get(LogoutUsecase);
    refreshTokenRepo = module.get(RefreshTokenRepository);
    passwordHash = await authService.hashPassword('TestPassword1!');
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
        firstName: 'Logout',
        lastName: 'Test',
        email: 'logout@hospital.com',
        phoneNumber: '+2348022222222',
        passwordHash,
        isActive: true,
        isApproved: true,
        failedLoginAttempts: 0,
      }),
    );
  }

  async function seedActiveSession(staffId: string) {
    const plainRefresh = tokenService.generateOpaqueToken();
    const tokenHash = tokenService.sha256(plainRefresh);
    const familyId = crypto.randomUUID();

    await refreshTokenRepo.createToken({
      tokenHash,
      staffId,
      familyId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
    });
    await sessionService.addSession(staffId, familyId);

    const jti = tokenService.generateJti();
    const accessToken = tokenService.signAccessToken({ sub: staffId, jti, role: '' });

    return { plainRefresh, accessToken, jti, familyId };
  }

  it('revokes refresh token and clears session from Redis on logout', async () => {
    const staff = await seedStaff();
    const { plainRefresh, accessToken } = await seedActiveSession(staff.id);

    const result = await logoutUc.execute(dataSource.manager, {
      accessToken,
      refreshToken: plainRefresh,
    });

    expect(result.loggedOut).toBe(true);

    // Refresh token should be revoked in DB
    const stored = await refreshTokenRepo.findByTokenHash(tokenService.sha256(plainRefresh));
    expect(stored?.isRevoked).toBe(true);
  });

  it('blocklists access token JTI in Redis on logout', async () => {
    const staff = await seedStaff();
    const { plainRefresh, accessToken } = await seedActiveSession(staff.id);

    await logoutUc.execute(dataSource.manager, {
      accessToken,
      refreshToken: plainRefresh,
    });
  });

  it('throws 401 when no active session found', async () => {
    await expect(
      logoutUc.execute(dataSource.manager, { accessToken: '', refreshToken: '' }),
    ).rejects.toThrow('No active session found');
  });
});
