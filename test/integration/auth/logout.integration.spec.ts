import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { createTestingModule } from '../../helpers/app.helper';
import { truncateAllTables } from '../../helpers/database.helper';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { TokenService } from '../../../src/modules/auth/services/token.service';
import { SessionService } from '../../../src/modules/auth/services/session.service';
import { LogoutUsecase } from '../../../src/modules/auth/usecases/logout.uc';
import { RefreshTokenRepository } from '../../../src/adapters/repositories/refreshToken.repository';
import { RedisService } from '../../../src/shared/redis/redis.service';
import { RedisKeys } from '../../../src/shared/redis/redis.constants';
import { Staff } from '../../../src/modules/core/entities/staff.entity';

describe('Logout Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let authService: AuthService;
  let tokenService: TokenService;
  let sessionService: SessionService;
  let logoutUc: LogoutUsecase;
  let refreshTokenRepo: RefreshTokenRepository;
  let redisService: RedisService;
  let passwordHash: string;

  beforeAll(async () => {
    module = await createTestingModule();
    dataSource = module.get(DataSource);
    authService = module.get(AuthService);
    tokenService = module.get(TokenService);
    sessionService = module.get(SessionService);
    logoutUc = module.get(LogoutUsecase);
    refreshTokenRepo = module.get(RefreshTokenRepository);
    redisService = module.get(RedisService);
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
    const { plainRefresh, accessToken, familyId } = await seedActiveSession(staff.id);

    const mockReq = {
      cookies: { access_token: accessToken, refresh_token: plainRefresh },
    } as any;
    const mockRes = { clearCookie: vi.fn() } as any;

    const result = await logoutUc.execute(dataSource.manager, { req: mockReq, res: mockRes });

    expect(result.loggedOut).toBe(true);
    expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);

    // Refresh token should be revoked in DB
    const stored = await refreshTokenRepo.findByTokenHash(tokenService.sha256(plainRefresh));
    expect(stored?.isRevoked).toBe(true);

    // Session should be removed from Redis
    const sessions = await redisService.smembers(RedisKeys.sessions(staff.id));
    expect(sessions).not.toContain(familyId);
  });

  it('blocklists access token JTI in Redis on logout', async () => {
    const staff = await seedStaff();
    const { plainRefresh, accessToken, jti } = await seedActiveSession(staff.id);

    const mockReq = {
      cookies: { access_token: accessToken, refresh_token: plainRefresh },
    } as any;

    await logoutUc.execute(dataSource.manager, {
      req: mockReq,
      res: { clearCookie: vi.fn() } as any,
    });

    const isBlocklisted = await redisService.exists(RedisKeys.jtiBlocklist(jti));
    expect(isBlocklisted).toBe(true);
  });

  it('throws 401 when no active session found', async () => {
    const mockReq = { cookies: {} } as any;
    const mockRes = { clearCookie: vi.fn() } as any;

    await expect(
      logoutUc.execute(dataSource.manager, { req: mockReq, res: mockRes }),
    ).rejects.toThrow('No active session found');
  });
});
