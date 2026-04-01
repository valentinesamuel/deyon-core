import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { createTestingModule } from '../../helpers/app.helper';
import { truncateAllTables } from '../../helpers/database.helper';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { TokenService } from '../../../src/modules/auth/services/token.service';
import { RefreshTokenRepository } from '../../../src/adapters/repositories/refreshToken.repository';
import { Staff } from '../../../src/modules/core/entities/staff.entity';
import { RefreshToken } from '../../../src/modules/core/entities/refreshToken.entity';

describe('RefreshTokenRepository Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let authService: AuthService;
  let tokenService: TokenService;
  let refreshTokenRepo: RefreshTokenRepository;
  let staffId: string;

  beforeAll(async () => {
    module = await createTestingModule();
    dataSource = module.get(DataSource);
    authService = module.get(AuthService);
    tokenService = module.get(TokenService);
    refreshTokenRepo = module.get(RefreshTokenRepository);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);

    // Seed a staff so FK constraints are satisfied
    const repo = dataSource.getRepository(Staff);
    const staff = await repo.save(
      repo.create({
        firstName: 'Token',
        lastName: 'Test',
        email: 'tokentest@hospital.com',
        phoneNumber: '+2348077777777',
        passwordHash: await authService.hashPassword('TestPassword1!'),
        isActive: true,
        isApproved: true,
        failedLoginAttempts: 0,
      }),
    );
    staffId = staff.id;
  });

  function newTokenData(familyId?: string) {
    const plain = tokenService.generateOpaqueToken();
    const tokenHash = tokenService.sha256(plain);
    return {
      plain,
      tokenHash,
      familyId: familyId ?? crypto.randomUUID(),
    };
  }

  it('createToken stores a non-revoked token', async () => {
    const { tokenHash, familyId } = newTokenData();

    const created = await refreshTokenRepo.createToken({
      tokenHash,
      staffId,
      familyId,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });

    expect(created.id).toBeTruthy();
    expect(created.isRevoked).toBe(false);
    expect(created.staffId).toBe(staffId);
  });

  it('findByTokenHash retrieves a token by its hash', async () => {
    const { tokenHash, familyId } = newTokenData();
    await refreshTokenRepo.createToken({
      tokenHash,
      staffId,
      familyId,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });

    const found = await refreshTokenRepo.findByTokenHash(tokenHash);
    expect(found).not.toBeNull();
    expect(found?.tokenHash).toBe(tokenHash);
  });

  it('findByTokenHash returns null for unknown hash', async () => {
    const result = await refreshTokenRepo.findByTokenHash('nonexistenthash');
    expect(result).toBeNull();
  });

  it('revokeToken marks token as revoked', async () => {
    const { tokenHash, familyId } = newTokenData();
    await refreshTokenRepo.createToken({
      tokenHash,
      staffId,
      familyId,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });

    await refreshTokenRepo.revokeToken(tokenHash);

    const found = await refreshTokenRepo.findByTokenHash(tokenHash);
    expect(found?.isRevoked).toBe(true);
  });

  it('revokeFamily revokes all tokens in the same family', async () => {
    const familyId = crypto.randomUUID();
    const { tokenHash: h1 } = newTokenData(familyId);
    const { tokenHash: h2 } = newTokenData(familyId);

    await refreshTokenRepo.createToken({
      tokenHash: h1,
      staffId,
      familyId,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });
    await refreshTokenRepo.createToken({
      tokenHash: h2,
      staffId,
      familyId,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });

    await refreshTokenRepo.revokeFamily(familyId);

    const all = await dataSource.getRepository(RefreshToken).find({ where: { familyId } });
    expect(all.every((t) => t.isRevoked)).toBe(true);
  });

  it('cascade-deletes refresh tokens when staff is deleted', async () => {
    const { tokenHash, familyId } = newTokenData();
    await refreshTokenRepo.createToken({
      tokenHash,
      staffId,
      familyId,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });

    // Delete the staff — cascade should remove tokens
    await dataSource.getRepository(Staff).delete(staffId);

    const rows = await dataSource.getRepository(RefreshToken).find({ where: { staffId } });
    expect(rows).toHaveLength(0);
  });
});
