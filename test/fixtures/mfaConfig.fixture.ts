import { faker } from '@faker-js/faker';
import { MfaConfig } from '@modules/core/entities/mfaConfig.entity';

export const TEST_MFA_PLAIN_SECRET = 'JBSWY3DPEHPK3PXP';

export function buildMfaConfigFixture(overrides: Partial<MfaConfig> = {}): MfaConfig {
  return {
    id: faker.string.uuid(),
    staffId: faker.string.uuid(),
    encryptedSecret: 'encrypted:rnauthTag:rniv', // placeholder
    backupCodeHashes: null,
    usedBackupCodes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } satisfies Partial<MfaConfig> as MfaConfig;
}
