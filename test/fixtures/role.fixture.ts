import { faker } from '@faker-js/faker';
import { Role } from '@modules/core/entities/role.entity';

export function buildRoleFixture(overrides: Partial<Role> = {}): Role {
  return {
    id: faker.string.uuid(),
    name: faker.word.noun(),
    alias: faker.word.noun(),
    isActive: true,
    isSystemRole: false,
    staffs: [],
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } satisfies Partial<Role> as Role;
}
