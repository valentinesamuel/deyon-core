import { RedisCacheAdapterConfig } from '../cache.adapter';

export interface ICacheProvider {
  get<T>(key: string, opt: RedisCacheAdapterConfig): Promise<T | null>;
  set(key: string, value: any, opt: RedisCacheAdapterConfig): Promise<void>;
  del(key: string, opt: RedisCacheAdapterConfig): Promise<void>;
  deleteMany(keys: string[], opt: RedisCacheAdapterConfig): Promise<void>;
  exists(key: string, opt: RedisCacheAdapterConfig): Promise<boolean>;
  ttl(key: string, opt: RedisCacheAdapterConfig): Promise<number>;
  expire(key: string, ttlSeconds: number, opt: RedisCacheAdapterConfig): Promise<void>;
  incr(key: string, opt: RedisCacheAdapterConfig): Promise<number>;
  getRaw(key: string, opt: RedisCacheAdapterConfig): Promise<string | null>;
  setnx(
    key: string,
    value: any,
    ttlSeconds: number,
    opt: RedisCacheAdapterConfig,
  ): Promise<boolean>;
  clear(pattern: string, opt: RedisCacheAdapterConfig): Promise<void>;
  keys(pattern: string, opt: RedisCacheAdapterConfig): Promise<string[]>;
  scanKeys(pattern: string, opt: RedisCacheAdapterConfig): Promise<string[]>;
}
