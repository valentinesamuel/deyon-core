import { registerAs } from '@nestjs/config';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const cacheConnectionOptions = {
  redis: {
    host: process.env.REDIS_HOST,
    port: Number.parseInt(String(process.env.REDIS_PORT), 10),
    password: process.env.REDIS_PASSWORD,
    permissionCacheDb: Number.parseInt(String(process.env.REDIS_PERMISSION_CACHE_DB), 10),
    url: process.env.REDIS_URL,
    tls: process.env.REDIS_TLS,
  },
};

export default registerAs('cacheConfig', () => cacheConnectionOptions);
