import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ParsedQuery } from '../types/query.types';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';

const CACHE_PREFIX = 'qe:cache';
const DEFAULT_TTL = 60;

/**
 * Produces a deterministic JSON string by sorting object keys recursively.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  const sorted = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((k) => JSON.stringify(k) + ':' + stableStringify((value as Record<string, unknown>)[k]));
  return '{' + sorted.join(',') + '}';
}

function buildCacheKey(entityName: string, parsedQuery: ParsedQuery): string {
  const hash = createHash('sha256').update(stableStringify(parsedQuery)).digest('hex');
  return `${CACHE_PREFIX}:${entityName}:${hash}`;
}

@Injectable()
export class QueryCache {
  constructor(private readonly cacheAdapter: CacheAdapter) {}

  async get<T>(entityName: string, parsedQuery: ParsedQuery): Promise<T | null> {
    const key = buildCacheKey(entityName, parsedQuery);
    return this.cacheAdapter.get<T>(key, { db: CacheDbType.AUTH });
  }

  async set(
    entityName: string,
    parsedQuery: ParsedQuery,
    data: unknown,
    ttlSeconds: number = DEFAULT_TTL,
  ): Promise<void> {
    const key = buildCacheKey(entityName, parsedQuery);
    await this.cacheAdapter.set(key, data, { db: CacheDbType.AUTH, ttl: ttlSeconds });
  }

  async invalidate(entityName: string): Promise<void> {
    const pattern = `${CACHE_PREFIX}:${entityName}:*`;
    const keys = await this.cacheAdapter.scanKeys(pattern, { db: CacheDbType.AUTH });
    if (keys.length > 0) {
      await this.cacheAdapter.deleteMany(keys, { db: CacheDbType.AUTH });
    }
  }

  /** Exposed for testing — computes the cache key for a given entity + query. */
  getCacheKey(entityName: string, parsedQuery: ParsedQuery): string {
    return buildCacheKey(entityName, parsedQuery);
  }
}
