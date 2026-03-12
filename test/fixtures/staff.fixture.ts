import { faker } from '@faker-js/faker';
import { Staff } from '@modules/core/entities/staff.entity';

export function buildStaffFixture(overrides: Partial<Staff> = {}): Staff {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$test$hashedpassword', // hash of 'TestPassword1!'
    isActive: true,
    isApproved: true,
    mfaEnabled: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    roleId: null,
    role: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } satisfies Partial<Staff> as Staff;
}
