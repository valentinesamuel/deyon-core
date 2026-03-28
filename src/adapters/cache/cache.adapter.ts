import { Injectable, Logger } from '@nestjs/common';
import { CacheInterface, CacheProviderEnum } from './icache.interface';
import { RedisProvider, CacheDbType } from './providers/redis.provider';

export type RedisCacheAdapterConfig = { db: CacheDbType; ttl?: number };
@Injectable()
export class CacheAdapter implements CacheInterface {
  private readonly logger = new Logger(CacheAdapter.name);
  private cacheProvider: CacheInterface;

  constructor(private readonly redisProvider: RedisProvider) {
    this.initializeProvider(CacheProviderEnum.REDIS);
  }

  async get<T>(key: string, opt: RedisCacheAdapterConfig): Promise<T | null> {
    return this.redisProvider.get<T>(key, { db: opt.db });
  }

  async set(key: string, value: any, opt: RedisCacheAdapterConfig): Promise<void> {
    this.logger.debug(`Attempting to set key ${key} with options:`, JSON.stringify(opt));
    await this.redisProvider.set(key, value, { db: opt.db, ttl: opt.ttl });
  }

  async del(key: string, opt: RedisCacheAdapterConfig): Promise<void> {
    await this.redisProvider.del(key, { db: opt.db });
  }

  async keys(pattern: string, opt: RedisCacheAdapterConfig): Promise<string[]> {
    return this.redisProvider.keys(pattern, { db: opt.db });
  }

  async setnx(
    key: string,
    value: any,
    ttlSeconds: number,
    opt: RedisCacheAdapterConfig,
  ): Promise<boolean> {
    return this.redisProvider.setnx(key, value, ttlSeconds, { db: opt.db });
  }

  async eval(
    script: string,
    numKeys: number,
    opt: RedisCacheAdapterConfig,
    ...args: any[]
  ): Promise<any> {
    return this.redisProvider.eval(script, numKeys, { db: opt.db }, ...args);
  }

  async getRaw(key: string, opt: RedisCacheAdapterConfig): Promise<string | null> {
    return this.redisProvider.getRaw(key, { db: opt.db });
  }

  async ttl(key: string, opt: RedisCacheAdapterConfig): Promise<number> {
    return this.redisProvider.ttl(key, { db: opt.db });
  }

  async clear(pattern: string, opt: RedisCacheAdapterConfig): Promise<void> {
    return this.redisProvider.clear(pattern, { db: opt.db });
  }

  async hget<T>(key: string, field: string, opt: RedisCacheAdapterConfig): Promise<T | null> {
    return this.redisProvider.hget<T>(key, field, { db: opt.db });
  }

  async hgetall<T>(key: string, opt: RedisCacheAdapterConfig): Promise<Record<string, T>> {
    return this.redisProvider.hgetall<T>(key, { db: opt.db });
  }

  async hset(key: string, field: string, value: any, opt: RedisCacheAdapterConfig): Promise<void> {
    return this.redisProvider.hset(key, field, value, { db: opt.db });
  }

  async hmset(
    key: string,
    fields: Record<string, any>,
    opt: RedisCacheAdapterConfig,
  ): Promise<void> {
    return this.redisProvider.hmset(key, fields, { db: opt.db });
  }

  async hdel(key: string, field: string, opt: RedisCacheAdapterConfig): Promise<void> {
    return this.redisProvider.hdel(key, field, { db: opt.db });
  }

  async sadd(key: string, member: string, opt: RedisCacheAdapterConfig): Promise<void> {
    return this.redisProvider.sadd(key, member, { db: opt.db });
  }

  async smembers(key: string, opt: RedisCacheAdapterConfig): Promise<string[]> {
    return this.redisProvider.smembers(key, { db: opt.db });
  }

  async srem(key: string, member: string, opt: RedisCacheAdapterConfig): Promise<void> {
    return this.redisProvider.srem(key, member, { db: opt.db });
  }

  async pipeline(
    commands: Array<{ method: string; args: any[] }>,
    opt: RedisCacheAdapterConfig,
  ): Promise<any[]> {
    return this.redisProvider.pipeline(commands, { db: opt.db });
  }

  async incr(key: string, opt: RedisCacheAdapterConfig): Promise<number> {
    return this.redisProvider.incr(key, { db: opt.db });
  }

  async expire(key: string, ttlSeconds: number, opt: RedisCacheAdapterConfig): Promise<void> {
    return this.redisProvider.expire(key, ttlSeconds, { db: opt.db });
  }

  async exists(key: string, opt: RedisCacheAdapterConfig): Promise<boolean> {
    return this.redisProvider.exists(key, { db: opt.db });
  }

  async scard(key: string, opt: RedisCacheAdapterConfig): Promise<number> {
    return this.redisProvider.scard(key, { db: opt.db });
  }

  async scanKeys(pattern: string, opt: RedisCacheAdapterConfig): Promise<string[]> {
    return this.redisProvider.scanKeys(pattern, { db: opt.db });
  }

  async deleteMany(keys: string[], opt: RedisCacheAdapterConfig): Promise<void> {
    return this.redisProvider.deleteMany(keys, { db: opt.db });
  }

  private initializeProvider(provider: CacheProviderEnum): void {
    switch (provider) {
      case CacheProviderEnum.REDIS:
        this.cacheProvider = this.redisProvider;
        this.logger.log('✅ Initialized Redis cache provider');
        break;
      default:
        this.logger.warn(
          `⚠️ Unknown cache provider '${provider}', falling back to Memory provider`,
        );
        break;
    }
  }
}
