import { faker } from '@faker-js/faker';
import { addDays } from 'date-fns';
import { RefreshToken } from '@modules/core/entities/refreshToken.entity';

export function buildRefreshTokenFixture(overrides: Partial<RefreshToken> = {}): RefreshToken {
  return {
    id: faker.string.uuid(),
    staffId: faker.string.uuid(),
    tokenHash: faker.string.hexadecimal({ length: 64 }),
    familyId: faker.string.uuid(),
    isRevoked: false,
    expiresAt: addDays(new Date(), 7),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as RefreshToken;
}
