import { faker } from '@faker-js/faker';
import { addDays } from 'date-fns';
import { InviteToken } from '@modules/core/entities/inviteToken.entity';

export function buildInviteFixture(overrides: Partial<InviteToken> = {}): InviteToken {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    tokenHash: faker.string.hexadecimal({ length: 64 }),
    invitedById: faker.string.uuid(),
    roleId: faker.string.uuid(),
    isUsed: false,
    expiresAt: addDays(new Date(), 2),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } satisfies Partial<InviteToken> as InviteToken;
}
