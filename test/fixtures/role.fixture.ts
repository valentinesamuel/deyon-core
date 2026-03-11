import { faker } from '@faker-js/faker';
import { Role } from '@modules/core/entities/role.entity';

export function buildRoleFixture(overrides: Partial<Role> = {}): Role {
  return {
    id: faker.string.uuid(),
    name: faker.word.noun(),
    description: faker.lorem.sentence(),
    isActive: true,
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Role;
}
