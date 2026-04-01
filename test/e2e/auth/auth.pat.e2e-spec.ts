import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestingModule, createTestApp } from '../../helpers/app.helper';
import { truncateAllTables, seedPermissionsAndRoles, seedPat } from '../../helpers/database.helper';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { TokenService } from '../../../src/modules/auth/services/token.service';
import { Staff } from '../../../src/modules/core/entities/staff.entity';
import { Role } from '../../../src/modules/core/entities/role.entity';
import { API_KEY_HEADER } from './auth.e2e-helper';

const TEAM_LEAD_EMAIL = 'teamlead@hospital.com';
const REGULAR_EMAIL = 'regular@hospital.com';
const TEST_PASSWORD = 'TestPassword1!';

describe('PAT E2E', () => {
  let module: TestingModule;
  let app: INestApplication;
  let dataSource: DataSource;
  let authService: AuthService;
  let tokenService: TokenService;
  let teamLeadId: string;
  let regularStaffId: string;

  beforeAll(async () => {
    module = await createTestingModule();
    app = await createTestApp(module);
    dataSource = module.get(DataSource);
    authService = module.get(AuthService);
    tokenService = module.get(TokenService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
    await seedPermissionsAndRoles(dataSource);

    const staffRepo = dataSource.getRepository(Staff);
    const roleRepo = dataSource.getRepository(Role);

    const teamLeadRole = await roleRepo.findOneOrFail({ where: { alias: 'team_lead' } });
    const superAdminRole = await roleRepo.findOneOrFail({ where: { alias: 'super_admin' } });

    const passwordHash = await authService.hashPassword(TEST_PASSWORD);

    const teamLead = await staffRepo.save(
      staffRepo.create({
        firstName: 'Team',
        lastName: 'Lead',
        email: TEAM_LEAD_EMAIL,
        phoneNumber: '+10000000001',
        passwordHash,
        isActive: true,
        isApproved: true,
        mfaEnabled: false,
        failedLoginAttempts: 0,
        roleId: teamLeadRole.id,
      }),
    );
    teamLeadId = teamLead.id;

    const regular = await staffRepo.save(
      staffRepo.create({
        firstName: 'Regular',
        lastName: 'Staff',
        email: REGULAR_EMAIL,
        phoneNumber: '+10000000002',
        passwordHash,
        isActive: true,
        isApproved: true,
        mfaEnabled: false,
        failedLoginAttempts: 0,
        roleId: superAdminRole.id, // super_admin but no pat:generate
      }),
    );
    regularStaffId = regular.id;
  });

  // ── Helper: seed PAT and return raw token + auth header ──────────────────

  async function patAuthHeader(staffId: string): Promise<Record<string, string>> {
    const raw = await seedPat(dataSource, tokenService, staffId);
    return { ...API_KEY_HEADER, Authorization: `Bearer ${raw}` };
  }

  // ── 1. Valid PAT authenticates successfully ───────────────────────────────

  it('valid PAT → 200 on protected endpoint', async () => {
    const headers = await patAuthHeader(teamLeadId);

    const res = await request(app.getHttpServer())
      .get('/api/v1/staff/pat')
      .set(headers)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── 2. Expired PAT → 401 ─────────────────────────────────────────────────

  it('expired PAT → 401', async () => {
    const raw = tokenService.generateOpaqueToken();
    const patRepo = dataSource.getRepository(
      (await import('../../../src/modules/core/entities/personalAccessToken.entity'))
        .PersonalAccessToken,
    );
    await patRepo.save(
      patRepo.create({
        tokenHash: tokenService.sha256(raw),
        staffId: teamLeadId,
        name: 'expired-pat',
        expiresAt: new Date(Date.now() - 1000), // already expired
        isRevoked: false,
      }),
    );

    await request(app.getHttpServer())
      .get('/api/v1/staff/pat')
      .set({ ...API_KEY_HEADER, Authorization: `Bearer ${raw}` })
      .expect(401);
  });

  // ── 3. Revoked PAT → 401 ─────────────────────────────────────────────────

  it('revoked PAT → 401', async () => {
    const raw = await seedPat(dataSource, tokenService, teamLeadId, 'to-revoke');
    const allPats = await request(app.getHttpServer())
      .get('/api/v1/staff/pat')
      .set({ ...API_KEY_HEADER, Authorization: `Bearer ${raw}` })
      .expect(200);

    const patId = allPats.body.result.pats[0].id;

    // Revoke it
    await request(app.getHttpServer())
      .delete(`/api/v1/staff/pat/${patId}`)
      .set({ ...API_KEY_HEADER, Authorization: `Bearer ${raw}` })
      .expect(200);

    // Try using the same token again — should be rejected
    await request(app.getHttpServer())
      .get('/api/v1/staff/pat')
      .set({ ...API_KEY_HEADER, Authorization: `Bearer ${raw}` })
      .expect(401);
  });

  // ── 4. POST /staff/pat with team lead → 201, raw token returned ──────────

  it('POST /staff/pat with team lead → 201, raw token returned once', async () => {
    const headers = await patAuthHeader(teamLeadId);

    const res = await request(app.getHttpServer())
      .post('/api/v1/staff/pat')
      .set(headers)
      .send({ name: 'my-ci-token' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.result.pat).toBeTypeOf('string');
    expect(res.body.result.pat.length).toBe(64); // 32 bytes hex
    expect(res.body.result.name).toBe('my-ci-token');
  });

  // ── 5. POST /staff/pat without pat:generate → 403 ────────────────────────

  it('POST /staff/pat with regular staff (no pat:generate permission) → 403', async () => {
    // regular staff has super_admin role which has *:* — need a role without it
    // Re-seed regular staff with a fresh role with no permissions
    const roleRepo = dataSource.getRepository(Role);
    const noPermRole = await roleRepo.save(
      roleRepo.create({ name: 'No Perm', alias: 'no_perm', isActive: true, isSystemRole: false }),
    );

    const staffRepo = dataSource.getRepository(Staff);
    await staffRepo.update(regularStaffId, { roleId: noPermRole.id });

    const raw = await seedPat(dataSource, tokenService, regularStaffId);

    await request(app.getHttpServer())
      .post('/api/v1/staff/pat')
      .set({ ...API_KEY_HEADER, Authorization: `Bearer ${raw}` })
      .send({ name: 'should-fail' })
      .expect(403);
  });

  // ── 6. GET /staff/pat → only own tokens listed ───────────────────────────

  it('GET /staff/pat → only own PATs returned', async () => {
    // seed one PAT each for teamLead and regular
    const raw1 = await seedPat(dataSource, tokenService, teamLeadId, 'lead-token');
    await seedPat(dataSource, tokenService, regularStaffId, 'regular-token');

    const res = await request(app.getHttpServer())
      .get('/api/v1/staff/pat')
      .set({ ...API_KEY_HEADER, Authorization: `Bearer ${raw1}` })
      .expect(200);

    expect(res.body.success).toBe(true);
    const pats = res.body.result.pats;
    expect(pats).toHaveLength(1);
    expect(pats[0].name).toBe('lead-token');
  });

  // ── 7. DELETE /staff/pat/:id → revoke succeeds; subsequent use → 401 ─────

  it('DELETE /staff/pat/:id → success; subsequent token use → 401', async () => {
    const raw = await seedPat(dataSource, tokenService, teamLeadId);
    const headers = { ...API_KEY_HEADER, Authorization: `Bearer ${raw}` };

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/staff/pat')
      .set(headers)
      .expect(200);

    const patId = listRes.body.result.pats[0].id;

    const deleteRes = await request(app.getHttpServer())
      .delete(`/api/v1/staff/pat/${patId}`)
      .set(headers)
      .expect(200);

    expect(deleteRes.body.result.revoked).toBe(true);

    // Token should now be rejected
    await request(app.getHttpServer()).get('/api/v1/staff/pat').set(headers).expect(401);
  });

  // ── 8. DELETE another staff's PAT → 404 ──────────────────────────────────

  it("DELETE /staff/pat/:id for another staff's token → 404", async () => {
    // Seed a PAT for regular staff
    const otherRaw = await seedPat(dataSource, tokenService, regularStaffId, 'other-pat');
    const otherHeaders = { ...API_KEY_HEADER, Authorization: `Bearer ${otherRaw}` };

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/staff/pat')
      .set(otherHeaders)
      .expect(200);

    const otherPatId = listRes.body.result.pats[0].id;

    // Team lead tries to delete regular staff's PAT
    const leadRaw = await seedPat(dataSource, tokenService, teamLeadId);

    await request(app.getHttpServer())
      .delete(`/api/v1/staff/pat/${otherPatId}`)
      .set({ ...API_KEY_HEADER, Authorization: `Bearer ${leadRaw}` })
      .expect(404);
  });
});
