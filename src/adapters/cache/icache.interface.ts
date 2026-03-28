import { RedisCacheAdapterConfig } from './cache.adapter';

export interface CacheInterface {
  get<T>(key: string, dbType: RedisCacheAdapterConfig): Promise<T | null>;
  set(key: string, value: any, opt: RedisCacheAdapterConfig): Promise<void>;
  del(key: string, opt: RedisCacheAdapterConfig): Promise<void>;
  deleteMany(keys: string[], opt: RedisCacheAdapterConfig): Promise<void>;
  exists(key: string, opt: RedisCacheAdapterConfig): Promise<boolean>;
  incr(key: string, opt: RedisCacheAdapterConfig): Promise<number>;
  expire(key: string, ttlSeconds: number, opt: RedisCacheAdapterConfig): Promise<void>;
  scard(key: string, opt: RedisCacheAdapterConfig): Promise<number>;
  scanKeys(pattern: string, opt: RedisCacheAdapterConfig): Promise<string[]>;
  keys(pattern: string, opt: RedisCacheAdapterConfig): Promise<string[]>;
  clear(pattern: string, opt: RedisCacheAdapterConfig): Promise<void>;
  hget<T>(key: string, field: string, opt: RedisCacheAdapterConfig): Promise<T | null>;
  hgetall<T>(key: string, opt: RedisCacheAdapterConfig): Promise<Record<string, T>>;
  hset(key: string, field: string, value: any, opt: RedisCacheAdapterConfig): Promise<void>;
  hmset(key: string, fields: Record<string, any>, opt: RedisCacheAdapterConfig): Promise<void>;
  hdel(key: string, field: string, opt: RedisCacheAdapterConfig): Promise<void>;
  sadd(key: string, member: string, opt: RedisCacheAdapterConfig): Promise<void>;
  smembers(key: string, opt: RedisCacheAdapterConfig): Promise<string[]>;
  srem(key: string, member: string, opt: RedisCacheAdapterConfig): Promise<void>;
  pipeline(
    commands: Array<{ method: string; args: any[] }>,
    opt: RedisCacheAdapterConfig,
  ): Promise<any[]>;
  setnx(
    key: string,
    value: any,
    ttlSeconds: number,
    opt: RedisCacheAdapterConfig,
  ): Promise<boolean>;
  eval(script: string, numKeys: number, opt: RedisCacheAdapterConfig, ...args: any[]): Promise<any>;
  getRaw(key: string, opt: RedisCacheAdapterConfig): Promise<string | null>;
  ttl(key: string, opt: RedisCacheAdapterConfig): Promise<number>;
}

export enum CacheProviderEnum {
  REDIS = 'redis',
}

export interface CacheKeyConfig {
  prefix: 'role' | 'profile';
  suffix: string;
}

export enum CacheKeyType {
  ROLE_PERMISSIONS = 'role_permissions',
  PROFILE_PERMISSIONS = 'profile_permissions',
}
