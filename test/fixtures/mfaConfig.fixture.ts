import { faker } from '@faker-js/faker';
import { MfaConfig } from '@modules/core/entities/mfaConfig.entity';

export function buildMfaConfigFixture(overrides: Partial<MfaConfig> = {}): MfaConfig {
  // plainSecret can be used to generate TOTP codes in tests
  const plainSecret = 'JBSWY3DPEHPK3PXP'; // well-known test secret
  return {
    id: faker.string.uuid(),
    staffId: faker.string.uuid(),
    encryptedSecret: 'encrypted:rnauthTag:rniv', // placeholder
    plainSecret, // NOT stored in DB; only in test fixture for code generation
    backupCodes: [],
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as MfaConfig;
}
