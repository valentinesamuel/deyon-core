import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { CacheInterface } from '../icache.interface';
import { RedisCacheAdapterConfig } from '../cache.adapter';

export enum CacheDbType {
  PERMISSION = 'permission',
  AUTH = 'auth',
}

@Injectable()
export class RedisProvider implements CacheInterface, OnModuleDestroy {
  private readonly logger = new Logger(RedisProvider.name);
  private readonly clients: Map<CacheDbType, Redis> = new Map();
  private readonly defaultTTLs: Map<CacheDbType, number> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeClients();
  }

  private initializeClients() {
    const enableTLS = this.configService.get('cacheConfig.redis.tls');
    const baseConfig = {
      host: this.configService.get<string>('cacheConfig.redis.host'),
      port: Number(this.configService.get<number>('cacheConfig.redis.port')),
      password: this.configService.get<string>('cacheConfig.redis.password'),
      tls: enableTLS === 'true' ? {} : undefined,
    };

    const permissionCacheDb = this.configService.get<number>('cacheConfig.redis.permissionCacheDb');

    // Initialize permission cache client
    const permissionClient = new Redis({
      ...baseConfig,
      db: permissionCacheDb,
    });
    this.clients.set(CacheDbType.PERMISSION, permissionClient);

    // Initialize auth cache client (same db as permission)
    const authClient = new Redis({
      ...baseConfig,
      db: permissionCacheDb,
    });

    this.clients.set(CacheDbType.AUTH, authClient);
    // Setup event listeners for each client
    this.clients.forEach((client, dbType) => {
      client.on('connect', () => {
        this.logger.log(`✅ Redis ${dbType} cache connected successfully`);
      });

      client.on('reconnecting', () => {
        this.logger.log(`✅ Redis ${dbType} cache connection is reconnecting...`);
      });

      client.on('error', (error) => {
        this.logger.error(`❌ Redis ${dbType} cache connection error:`, error);
      });
    });
  }

  private getClient(dbType: CacheDbType): Redis {
    if (!dbType) {
      throw new Error('Database type must be specified');
    }
    const client = this.clients.get(dbType);
    if (!client) {
      throw new Error(`Redis client not found for database type: ${dbType}`);
    }
    return client;
  }

  async get<T>(key: string, opt: RedisCacheAdapterConfig): Promise<T | null> {
    try {
      const client = this.getClient(opt.db);
      const cached = await client.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error(`❌ Error getting cache key ${key} from ${opt.db} db:`, error);
      return null;
    }
  }

  async set(key: string, value: any, opt: RedisCacheAdapterConfig): Promise<void> {
    try {
      const client = this.getClient(opt.db);
      const stringValue = JSON.stringify(value);
      const finalTTL = opt.ttl || this.defaultTTLs.get(opt.db);

      if (finalTTL) {
        await client.setex(key, finalTTL, stringValue);
      } else {
        await client.set(key, stringValue);
      }
      this.logger.debug(`✅ Cache set for key: ${key} in ${opt.db} db`);
    } catch (error) {
      this.logger.error(`❌ Error setting cache key ${key} in ${opt.db} db:`, error);
    }
  }

  async del(key: string, opt: RedisCacheAdapterConfig): Promise<void> {
    try {
      const client = this.getClient(opt.db);
      await client.del(key);
      this.logger.debug(`✅ Cache deleted for key: ${key} in ${opt.db} db`);
    } catch (error) {
      this.logger.error(`❌ Error deleting cache key ${key} in ${opt.db} db:`, error);
    }
  }

  async clear(pattern: string, opt: RedisCacheAdapterConfig): Promise<void> {
    try {
      const client = this.getClient(opt.db);
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
        this.logger.debug(`✅ Cache cleared for pattern: ${pattern} in ${opt.db} db`);
      }
    } catch (error) {
      this.logger.error(`❌ Error clearing cache pattern ${pattern} in ${opt.db} db:`, error);
    }
  }

  async keys(pattern: string, opt: RedisCacheAdapterConfig): Promise<string[]> {
    try {
      const client = this.getClient(opt.db);
      return await client.keys(pattern);
    } catch (error) {
      this.logger.error(`❌ Error getting keys for pattern ${pattern} in ${opt.db} db:`, error);
      return [];
    }
  }

  async hget<T>(key: string, field: string, opt: RedisCacheAdapterConfig): Promise<T | null> {
    try {
      const client = this.getClient(opt.db);
      const cached = await client.hget(key, field);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error(
        `❌ Error getting hash field ${field} for key ${key} from ${opt.db} db:`,
        error,
      );
      return null;
    }
  }

  async hgetall<T>(key: string, opt: RedisCacheAdapterConfig): Promise<Record<string, T>> {
    try {
      const client = this.getClient(opt.db);
      const cached = await client.hgetall(key);
      const result: Record<string, T> = {};

      for (const [field, value] of Object.entries(cached)) {
        if (value) {
          result[field] = JSON.parse(value);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(
        `❌ Error getting all hash fields for key ${key} from ${opt.db} db:`,
        error,
      );
      return {};
    }
  }

  async hset(key: string, field: string, value: any, opt: RedisCacheAdapterConfig): Promise<void> {
    try {
      const client = this.getClient(opt.db);
      const stringValue = JSON.stringify(value);
      await client.hset(key, field, stringValue);

      const finalTTL = opt.ttl || this.defaultTTLs.get(opt.db);
      if (finalTTL) {
        await client.expire(key, finalTTL);
      }

      this.logger.debug(`✅ Hash field set for key: ${key}, field: ${field} in ${opt.db} db`);
    } catch (error) {
      this.logger.error(
        `❌ Error setting hash field ${field} for key ${key} in ${opt.db} db:`,
        error,
      );
    }
  }

  async hmset(
    key: string,
    fields: Record<string, any>,
    opt: RedisCacheAdapterConfig,
  ): Promise<void> {
    try {
      const client = this.getClient(opt.db);
      const serializedFields: Record<string, string> = {};

      for (const [field, value] of Object.entries(fields)) {
        serializedFields[field] = JSON.stringify(value);
      }

      await client.hmset(key, serializedFields);

      const finalTTL = opt.ttl || this.defaultTTLs.get(opt.db);
      if (finalTTL) {
        await client.expire(key, finalTTL);
      }

      this.logger.debug(`✅ Hash fields set for key: ${key} in ${opt.db} db`);
    } catch (error) {
      this.logger.error(`❌ Error setting hash fields for key ${key} in ${opt.db} db:`, error);
    }
  }

  async hdel(key: string, field: string, opt: RedisCacheAdapterConfig): Promise<void> {
    try {
      const client = this.getClient(opt.db);
      await client.hdel(key, field);
      this.logger.debug(`✅ Hash field deleted for key: ${key}, field: ${field} in ${opt.db} db`);
    } catch (error) {
      this.logger.error(
        `❌ Error deleting hash field ${field} for key ${key} in ${opt.db} db:`,
        error,
      );
    }
  }

  async sadd(key: string, member: string, opt: RedisCacheAdapterConfig): Promise<void> {
    try {
      const client = this.getClient(opt.db);
      await client.sadd(key, member);

      const finalTTL = opt.ttl || this.defaultTTLs.get(opt.db);
      if (finalTTL) {
        await client.expire(key, finalTTL);
      }

      this.logger.debug(`✅ Set member added for key: ${key}, member: ${member} in ${opt.db} db`);
    } catch (error) {
      this.logger.error(
        `❌ Error adding set member ${member} for key ${key} in ${opt.db} db:`,
        error,
      );
    }
  }

  async smembers(key: string, opt: RedisCacheAdapterConfig): Promise<string[]> {
    try {
      const client = this.getClient(opt.db);
      return await client.smembers(key);
    } catch (error) {
      this.logger.error(`❌ Error getting set members for key ${key} from ${opt.db} db:`, error);
      return [];
    }
  }

  async srem(key: string, member: string, opt: RedisCacheAdapterConfig): Promise<void> {
    try {
      const client = this.getClient(opt.db);
      await client.srem(key, member);
      this.logger.debug(`✅ Set member removed for key: ${key}, member: ${member} in ${opt.db} db`);
    } catch (error) {
      this.logger.error(
        `❌ Error removing set member ${member} for key ${key} in ${opt.db} db:`,
        error,
      );
    }
  }

  async pipeline(
    commands: Array<{ method: string; args: any[] }>,
    opt: RedisCacheAdapterConfig,
  ): Promise<any[]> {
    try {
      const client = this.getClient(opt.db);
      const pipeline = client.pipeline();

      commands.forEach(({ method, args }) => {
        (pipeline as any)[method](...args);
      });

      const results = await pipeline.exec();
      return (
        results?.map(([error, result]) => {
          if (error) throw error;
          return result;
        }) || []
      );
    } catch (error) {
      this.logger.error(`❌ Error executing pipeline in ${opt.db} db:`, error);
      return [];
    }
  }

  async setnx(
    key: string,
    value: any,
    ttlSeconds: number,
    opt: RedisCacheAdapterConfig,
  ): Promise<boolean> {
    try {
      const client = this.getClient(opt.db);
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      const result = await client.set(key, stringValue, 'EX', ttlSeconds, 'NX');
      this.logger.debug(`✅ SETNX operation for key: ${key} in ${opt.db} db - result: ${result}`);
      return result === 'OK';
    } catch (error) {
      this.logger.error(`❌ Error with SETNX for key ${key} in ${opt.db} db:`, error);
      return false;
    }
  }

  async eval(
    script: string,
    numKeys: number,
    opt: RedisCacheAdapterConfig,
    ...args: any[]
  ): Promise<any> {
    try {
      const client = this.getClient(opt.db);
      const result = await client.eval(script, numKeys, ...args);
      this.logger.debug(`✅ EVAL operation in ${opt.db} db completed`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error executing Lua script in ${opt.db} db:`, error);
      throw error;
    }
  }

  async getRaw(key: string, opt: RedisCacheAdapterConfig): Promise<string | null> {
    try {
      const client = this.getClient(opt.db);
      const result = await client.get(key);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error getting raw value for key ${key} from ${opt.db} db:`, error);
      return null;
    }
  }

  async ttl(key: string, opt: RedisCacheAdapterConfig): Promise<number> {
    try {
      const client = this.getClient(opt.db);
      const result = await client.ttl(key);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error getting TTL for key ${key} from ${opt.db} db:`, error);
      return -1;
    }
  }

  async incr(key: string, opt: RedisCacheAdapterConfig): Promise<number> {
    try {
      const client = this.getClient(opt.db);
      return await client.incr(key);
    } catch (error) {
      this.logger.error(`❌ Error incrementing key ${key} in ${opt.db} db:`, error);
      return 0;
    }
  }

  async expire(key: string, ttlSeconds: number, opt: RedisCacheAdapterConfig): Promise<void> {
    try {
      const client = this.getClient(opt.db);
      await client.expire(key, ttlSeconds);
    } catch (error) {
      this.logger.error(`❌ Error setting expiry for key ${key} in ${opt.db} db:`, error);
    }
  }

  async exists(key: string, opt: RedisCacheAdapterConfig): Promise<boolean> {
    try {
      const client = this.getClient(opt.db);
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`❌ Error checking existence of key ${key} in ${opt.db} db:`, error);
      return false;
    }
  }

  async scard(key: string, opt: RedisCacheAdapterConfig): Promise<number> {
    try {
      const client = this.getClient(opt.db);
      return await client.scard(key);
    } catch (error) {
      this.logger.error(`❌ Error getting scard for key ${key} in ${opt.db} db:`, error);
      return 0;
    }
  }

  async scanKeys(pattern: string, opt: RedisCacheAdapterConfig): Promise<string[]> {
    try {
      const client = this.getClient(opt.db);
      const keys: string[] = [];
      let cursor = '0';
      do {
        const [nextCursor, batch] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        keys.push(...batch);
      } while (cursor !== '0');
      return keys;
    } catch (error) {
      this.logger.error(`❌ Error scanning keys for pattern ${pattern} in ${opt.db} db:`, error);
      return [];
    }
  }

  async deleteMany(keys: string[], opt: RedisCacheAdapterConfig): Promise<void> {
    try {
      if (keys.length === 0) return;
      const client = this.getClient(opt.db);
      await client.del(...keys);
      this.logger.debug(`✅ Deleted ${keys.length} keys in ${opt.db} db`);
    } catch (error) {
      this.logger.error(`❌ Error deleting multiple keys in ${opt.db} db:`, error);
    }
  }

  async ping(): Promise<void> {
    const client = this.getClient(CacheDbType.PERMISSION);
    const result = await client.ping();
    if (result !== 'PONG') {
      throw new Error('Redis ping failed');
    }
  }

  async onModuleDestroy() {
    for (const client of this.clients.values()) {
      await client.quit();
    }
  }
}
