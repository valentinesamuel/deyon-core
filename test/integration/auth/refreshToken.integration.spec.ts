import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { createTestingModule } from '../../helpers/app.helper';
import { truncateAllTables } from '../../helpers/database.helper';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { TokenService } from '../../../src/modules/auth/services/token.service';
import { SessionService } from '../../../src/modules/auth/services/session.service';
import { RefreshTokenUsecase } from '../../../src/modules/auth/usecases/refreshToken.uc';
import { RefreshTokenRepository } from '../../../src/adapters/repositories/refreshToken.repository';
import { Staff } from '../../../src/modules/core/entities/staff.entity';
import { RefreshToken } from '../../../src/modules/core/entities/refreshToken.entity';

describe('RefreshToken Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let authService: AuthService;
  let tokenService: TokenService;
  let sessionService: SessionService;
  let refreshUc: RefreshTokenUsecase;
  let refreshTokenRepo: RefreshTokenRepository;
  let passwordHash: string;

  beforeAll(async () => {
    module = await createTestingModule();
    dataSource = module.get(DataSource);
    authService = module.get(AuthService);
    tokenService = module.get(TokenService);
    sessionService = module.get(SessionService);
    refreshUc = module.get(RefreshTokenUsecase);
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
        firstName: 'Refresh',
        lastName: 'Test',
        email: 'refresh@hospital.com',
        passwordHash,
        isActive: true,
        isApproved: true,
        failedLoginAttempts: 0,
      }),
    );
  }

  async function seedActiveRefreshToken(
    staffId: string,
  ): Promise<{ plain: string; familyId: string }> {
    const plainToken = tokenService.generateOpaqueToken();
    const tokenHash = tokenService.sha256(plainToken);
    const familyId = crypto.randomUUID();

    await refreshTokenRepo.createToken({
      tokenHash,
      staffId,
      familyId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
    });
    await sessionService.addSession(staffId, familyId);

    return { plain: plainToken, familyId };
  }

  it('rotates refresh token — old revoked, new issued', async () => {
    const staff = await seedStaff();
    const { plain } = await seedActiveRefreshToken(staff.id);

    const mockReq = { cookies: { refresh_token: plain } } as any;
    const mockRes = { cookie: vi.fn(), clearCookie: vi.fn() } as any;

    const result = await refreshUc.execute(dataSource.manager, {
      req: mockReq,
      res: mockRes,
    });

    expect(result.refreshed).toBe(true);
    expect(mockRes.cookie).toHaveBeenCalledTimes(2); // new access + refresh cookies

    // Old token should be revoked
    const oldHash = tokenService.sha256(plain);
    const old = await refreshTokenRepo.findByTokenHash(oldHash);
    expect(old?.isRevoked).toBe(true);

    // One new token should exist
    const all = await dataSource.getRepository(RefreshToken).find({ where: { staffId: staff.id } });
    const active = all.filter((t) => !t.isRevoked);
    expect(active).toHaveLength(1);
  });

  it('detects token theft — revoking a previously-revoked token terminates the family', async () => {
    const staff = await seedStaff();
    const { plain, familyId } = await seedActiveRefreshToken(staff.id);

    // Revoke the token manually (simulating a stolen & used token)
    await refreshTokenRepo.revokeToken(tokenService.sha256(plain));

    const mockReq = { cookies: { refresh_token: plain } } as any;
    const mockRes = { cookie: vi.fn(), clearCookie: vi.fn() } as any;

    await expect(
      refreshUc.execute(dataSource.manager, { req: mockReq, res: mockRes }),
    ).rejects.toThrow('Token reuse detected');

    // All tokens in the family must be revoked
    const familyTokens = await dataSource.getRepository(RefreshToken).find({ where: { familyId } });
    expect(familyTokens.every((t) => t.isRevoked)).toBe(true);
  });

  it('throws 401 when no refresh token cookie present', async () => {
    const mockReq = { cookies: {} } as any;
    const mockRes = { cookie: vi.fn(), clearCookie: vi.fn() } as any;

    await expect(
      refreshUc.execute(dataSource.manager, { req: mockReq, res: mockRes }),
    ).rejects.toThrow('No refresh token provided');
  });
});
