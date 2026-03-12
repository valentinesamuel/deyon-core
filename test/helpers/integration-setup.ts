import { inject } from 'vitest';

/**
 * Set all environment variables required by Joi schema validation and TypeORM config.
 * Must be called before the NestJS module is compiled.
 *
 * Parses the TestContainers PG connection string into individual DATABASE_* env vars
 * because src/configs/typeorm.config.ts reads from process.env directly.
 *
 * Sets NODE_ENV=development to avoid `dropSchema: true` and `migrationsRun: true`
 * behaviour in typeorm.config.ts (both are keyed on NODE_ENV === 'test').
 */
export function setTestEnv(): void {
  const pgUrl = inject('pgConnectionString');
  const url = new URL(pgUrl);

  process.env.DATABASE_HOST = url.hostname;
  process.env.DATABASE_PORT = url.port || '5432';
  process.env.DATABASE_DB = url.pathname.slice(1); // strip leading '/'
  process.env.DATABASE_USER = url.username;
  process.env.DATABASE_PASSWORD = url.password;
  process.env.DATABASE_TYPE = 'postgres';
  // Synchronize=true lets TypeORM auto-create tables without running dist/ migrations
  process.env.DATABASE_SYNCHRONIZE = 'true';
  process.env.DATABASE_LOGGING = 'false';
  process.env.DATABASE_RETRY_ATTEMPTS = '3';

  const redisHost = inject('redisHost');
  const redisPort = inject('redisPort');
  process.env.REDIS_URL = `redis://${redisHost}:${redisPort}`;
  process.env.REDIS_HOST = redisHost;
  process.env.REDIS_PORT = redisPort;

  // CRITICAL: 'test' triggers dropSchema + migrationsRun in typeorm.config.ts — use 'development'
  process.env.NODE_ENV = 'development';

  // Required by Joi validation schema (schema.config.ts)
  process.env.APP_NAME = 'deyon-test';
  process.env.APP_HOSTNAME = 'localhost';
  // TOKEN_ENCRYPTION_KEY: exactly 32 ASCII chars → 32 bytes for AES-256-GCM
  process.env.TOKEN_ENCRYPTION_KEY = '12345678901234567890123456789012';
  process.env.SWAGGER_API_ROOT = 'api-docs';
  process.env.DEBUGGER_NAME = 'x-debugger-key';
  process.env.DEBUGGER_KEY = 'test-debugger-key';
  process.env.HEALTH_NAME = 'x-health-key';
  process.env.HEALTH_KEY = 'test-health-key';
  // JWT_ACCESS_SECRET: Joi requires min 32 chars
  process.env.JWT_ACCESS_SECRET = 'test-jwt-secret-that-is-at-least-32-chars-long!';
  process.env.FRONTEND_URL = 'http://localhost:3001';
  // AuthorizationGuard reads these for all non-health requests
  process.env.APP_AUTH_NAME = 'x-api-key';
  process.env.APP_KEY = 'test-api-key';
}

// Runs automatically for every test file that uses this setupFile
setTestEnv();
