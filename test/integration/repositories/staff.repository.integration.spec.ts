import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { createTestingModule } from '../../helpers/app.helper';
import { truncateAllTables } from '../../helpers/database.helper';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { StaffRepository } from '../../../src/adapters/repositories/staff.repository';

describe('StaffRepository Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let authService: AuthService;
  let staffRepo: StaffRepository;
  let passwordHash: string;

  beforeAll(async () => {
    module = await createTestingModule();
    dataSource = module.get(DataSource);
    authService = module.get(AuthService);
    staffRepo = module.get(StaffRepository);
    passwordHash = await authService.hashPassword('TestPassword1!');
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
  });

  const createStaffData = (email = 'repo@hospital.com') => ({
    firstName: 'Repo',
    lastName: 'Test',
    email,
    passwordHash,
    isActive: true,
    isApproved: true,
    failedLoginAttempts: 0,
  });

  it('createStaff inserts a row with correct column mapping', async () => {
    const staff = await staffRepo.createStaff(createStaffData());

    expect(staff.id).toBeTypeOf('string');
    expect(staff.firstName).toBe('Repo');
    expect(staff.lastName).toBe('Test');
    expect(staff.email).toBe('repo@hospital.com');

    // Verify row in DB via raw query (confirms snake_case naming strategy)
    const rows = await dataSource.query(
      'SELECT first_name, last_name, email FROM staff WHERE id = $1',
      [staff.id],
    );
    expect(rows[0].first_name).toBe('Repo');
    expect(rows[0].last_name).toBe('Test');
    expect(rows[0].email).toBe('repo@hospital.com');
  });

  it('findOneOrFailIfExists throws ConflictException when staff exists', async () => {
    const staff = await staffRepo.createStaff(createStaffData());

    await expect(staffRepo.findOneOrFailIfExists({ where: { id: staff.id } })).rejects.toThrow(
      'Resource already exists',
    );
  });

  it('findOneOrFailIfExists resolves when staff not found', async () => {
    await expect(
      staffRepo.findOneOrFailIfExists({ where: { id: 'non-existent-uuid' } }),
    ).resolves.toBeNull();
  });

  it('findOneOrFailIfNotExists returns staff when found', async () => {
    const created = await staffRepo.createStaff(createStaffData());

    const found = await staffRepo.findOneOrFailIfNotExists({ where: { id: created.id } });
    expect(found.id).toBe(created.id);
    expect(found.email).toBe('repo@hospital.com');
  });

  it('findOneOrFailIfNotExists throws NotFoundException when not found', async () => {
    await expect(
      staffRepo.findOneOrFailIfNotExists({ where: { id: 'non-existent-uuid' } }),
    ).rejects.toThrow('Resource not found');
  });

  it('updateStaff applies partial updates', async () => {
    const staff = await staffRepo.createStaff(createStaffData());

    const updated = await staffRepo.updateStaff(staff.id, { firstName: 'Updated' });
    expect(updated?.firstName).toBe('Updated');
    expect(updated?.lastName).toBe('Test'); // unchanged
  });

  it('findOneOrFailIfExists throws when duplicate email', async () => {
    await staffRepo.createStaff(createStaffData('dup@hospital.com'));

    await expect(
      staffRepo.findOneOrFailIfExists({ where: { email: 'dup@hospital.com' } }),
    ).rejects.toThrow('Resource already exists');
  });
});
