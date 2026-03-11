import type { GlobalSetupContext } from 'vitest/node';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';

// Declare injected values so both provide() and inject() are type-safe
declare module 'vitest' {
  export interface ProvidedContext {
    pgConnectionString: string;
    redisPort: string;
    redisHost: string;
  }
}

let pgContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;

export async function setup({ provide }: GlobalSetupContext) {
  [pgContainer, redisContainer] = await Promise.all([
    new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('deyon_test')
      .withUsername('test')
      .withPassword('test')
      .start(),
    new RedisContainer('redis:7-alpine').start(),
  ]);

  provide('pgConnectionString', pgContainer.getConnectionUri());
  provide('redisPort', String(redisContainer.getMappedPort(6379)));
  provide('redisHost', redisContainer.getHost());
}

export async function teardown() {
  await Promise.all([pgContainer?.stop(), redisContainer?.stop()]);
}
