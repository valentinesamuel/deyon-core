import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { createTestingModule } from '../../helpers/app.helper';
import { truncateAllTables, seedPermissionsAndRoles } from '../../helpers/database.helper';
import { CreateRoleUsecase } from '../../../src/modules/role/usecases/createRole.uc';
import { Role } from '../../../src/modules/core/entities/role.entity';

describe('CreateRole Integration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let createRoleUc: CreateRoleUsecase;

  beforeAll(async () => {
    module = await createTestingModule();
    dataSource = module.get(DataSource);
    createRoleUc = module.get(CreateRoleUsecase);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await truncateAllTables(dataSource);
    await seedPermissionsAndRoles(dataSource);
  });

  const callCreateRole = (name: string, permissions: string[]) =>
    createRoleUc.execute(dataSource.manager, {
      params: { name, permissions },
    });

  it('creates a role with specified permissions', async () => {
    const result = await callCreateRole('Doctor', ['staff:read', 'staff:update']);

    expect(result.name).toBe('Doctor');
    expect(result.alias).toBe('doctor');
    expect(result.permissions).toHaveLength(2);
    expect(result.permissions.map((p) => p.code)).toContain('staff:read');
    expect(result.permissions.map((p) => p.code)).toContain('staff:update');

    // Verify DB row
    const role = await dataSource.getRepository(Role).findOne({
      where: { name: 'Doctor' },
      relations: ['permissions'],
    });
    expect(role).toBeDefined();
    expect(role?.permissions).toHaveLength(2);
  });

  it('creates a role with new (non-seeded) permission codes', async () => {
    const result = await callCreateRole('Pharmacist', ['pharmacy:dispense']);

    expect(result.name).toBe('Pharmacist');
    expect(result.permissions.map((p) => p.code)).toContain('pharmacy:dispense');
  });

  it('throws 409 for duplicate role name', async () => {
    await callCreateRole('Nurse', ['staff:read']);

    await expect(callCreateRole('Nurse', ['staff:read'])).rejects.toThrow();
  });

  it('converts role name to snake_case alias', async () => {
    const result = await callCreateRole('Senior Doctor', ['staff:read']);
    expect(result.alias).toBe('senior_doctor');
  });
});
