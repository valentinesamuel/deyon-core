import { setTestEnv } from './integration-setup';

/**
 * E2E test setup file — delegates to the same setTestEnv() used by integration tests
 * so both tiers share identical environment configuration.
 */
setTestEnv();
