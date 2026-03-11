import { faker } from '@faker-js/faker';
import { Permission } from '@modules/core/entities/permission.entity';

export function buildPermissionFixture(overrides: Partial<Permission> = {}): Permission {
  const module = faker.helpers.arrayElement(['staff', 'role', 'auth', 'setup']);
  const action = faker.helpers.arrayElement(['read', 'write', 'delete', 'all']);
  return {
    id: faker.string.uuid(),
    code: `${module}:${action}`,
    name: `${module} ${action}`,
    description: faker.lorem.sentence(),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Permission;
}
