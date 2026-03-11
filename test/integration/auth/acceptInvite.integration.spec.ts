import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { addDays, subDays } from 'date-fns';
import { createTestingModule } from '../../helpers/app.helper';
import { truncateAllTables, seedPermissionsAndRoles } from '../../helpers/database.helper';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { TokenService } from '../../../src/modules/auth/services/token.service';
import { AcceptInviteUsecase } from '../../../src/modules/auth/usecases/acceptInvite.uc';
import { Staff } from '../../../src/modules/core/entities/staff.entity';
import { InviteToken } from '../../../src/modules/core/entities/inviteToken.entity';
import { Role } from '../../../src/modules/core/entities/role.entity';

describe('AcceptInvite Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let authService: AuthService;
  let tokenService: TokenService;
  let acceptInviteUc: AcceptInviteUsecase;
  let roleId: string;

  beforeAll(async () => {
    module = await createTestingModule();
    dataSource = module.get(DataSource);
    authService = module.get(AuthService);
    tokenService = module.get(TokenService);
    acceptInviteUc = module.get(AcceptInviteUsecase);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
    await seedPermissionsAndRoles(dataSource);

    // Get the seeded super_admin role id
    const role = await dataSource
      .getRepository(Role)
      .findOneOrFail({ where: { alias: 'super_admin' } });
    roleId = role.id;
  });

  async function seedInvite(overrides: Partial<InviteToken> = {}) {
    const plainToken = tokenService.generateOpaqueToken();
    const tokenHash = tokenService.sha256(plainToken);

    const repo = dataSource.getRepository(InviteToken);
    await repo.save(
      repo.create({
        tokenHash,
        email: 'newstaff@hospital.com',
        roleId,
        isUsed: false,
        expiresAt: addDays(new Date(), 2),
        ...overrides,
      }),
    );

    return plainToken;
  }

  it('creates staff and marks invite as used for valid token', async () => {
    const plainToken = await seedInvite();

    const result = await acceptInviteUc.execute(dataSource.manager, {
      token: plainToken,
      firstName: 'New',
      lastName: 'Staff',
      phoneNumber: '+2348012345678',
      password: 'StrongPass1!',
    });

    expect(result.requiresMfaSetup).toBe(true);
    expect(result.setupToken).toBeTypeOf('string');
    expect(result.staffId).toBeTypeOf('string');

    // Staff should exist in DB
    const staff = await dataSource.getRepository(Staff).findOne({
      where: { email: 'newstaff@hospital.com' },
    });
    expect(staff).toBeDefined();
    expect(staff?.isActive).toBe(true);

    // Invite should be marked as used
    const invite = await dataSource
      .getRepository(InviteToken)
      .findOne({ where: { tokenHash: tokenService.sha256(plainToken) } });
    expect(invite?.isUsed).toBe(true);
  });

  it('throws 400 for expired invite token', async () => {
    const plainToken = await seedInvite({ expiresAt: subDays(new Date(), 1) });

    await expect(
      acceptInviteUc.execute(dataSource.manager, {
        token: plainToken,
        firstName: 'New',
        lastName: 'Staff',
        phoneNumber: '+2348012345678',
        password: 'StrongPass1!',
      }),
    ).rejects.toThrow('Invite token has expired');
  });

  it('throws 409 for duplicate email', async () => {
    const plainToken = await seedInvite({ email: 'duplicate@hospital.com' });

    // Seed a staff with the same email
    const staffRepo = dataSource.getRepository(Staff);
    await staffRepo.save(
      staffRepo.create({
        firstName: 'Existing',
        lastName: 'Staff',
        email: 'duplicate@hospital.com',
        passwordHash: await authService.hashPassword('SomePass1!'),
        isActive: true,
        isApproved: true,
        failedLoginAttempts: 0,
      }),
    );

    await expect(
      acceptInviteUc.execute(dataSource.manager, {
        token: plainToken,
        firstName: 'New',
        lastName: 'Staff',
        phoneNumber: '+2348012345678',
        password: 'StrongPass1!',
      }),
    ).rejects.toThrow('already exists');
  });
});
