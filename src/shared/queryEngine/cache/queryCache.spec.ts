import { describe, it, expect, beforeEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { QueryCache } from './queryCache';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { ParsedQuery } from '../types/query.types';

const AUTH = { db: CacheDbType.AUTH };

function makeParsedQuery(overrides: Partial<ParsedQuery> = {}): ParsedQuery {
  return {
    whereAst: null,
    havingAst: null,
    sort: [],
    limit: 20,
    cursor: null,
    search: [],
    groupBy: [],
    aggregates: [],
    include: [],
    fields: {},
    withDeleted: false,
    withTotal: false,
    ...overrides,
  };
}

describe('QueryCache', () => {
  let cache: QueryCache;
  let cacheAdapter: ReturnType<typeof mock<CacheAdapter>>;

  beforeEach(() => {
    cacheAdapter = mock<CacheAdapter>();
    cache = new QueryCache(cacheAdapter);
  });

  describe('getCacheKey', () => {
    it('produces deterministic keys for the same input', () => {
      const q = makeParsedQuery({ limit: 10 });
      const key1 = cache.getCacheKey('Staff', q);
      const key2 = cache.getCacheKey('Staff', q);
      expect(key1).toBe(key2);
    });

    it('produces different keys for different entities', () => {
      const q = makeParsedQuery();
      expect(cache.getCacheKey('Staff', q)).not.toBe(cache.getCacheKey('Role', q));
    });

    it('produces different keys for different queries', () => {
      const q1 = makeParsedQuery({ limit: 10 });
      const q2 = makeParsedQuery({ limit: 20 });
      expect(cache.getCacheKey('Staff', q1)).not.toBe(cache.getCacheKey('Staff', q2));
    });

    it('key starts with qe:cache:<entityName>:', () => {
      const key = cache.getCacheKey('Staff', makeParsedQuery());
      expect(key).toMatch(/^qe:cache:Staff:[a-f0-9]{64}$/);
    });
  });

  describe('get', () => {
    it('returns cached value when present', async () => {
      const q = makeParsedQuery();
      const expected = {
        data: [],
        meta: { hasMore: false, limit: 20, nextCursor: null, prevCursor: null },
      };
      cacheAdapter.get.mockResolvedValue(expected);

      const result = await cache.get('Staff', q);
      expect(result).toEqual(expected);
      expect(cacheAdapter.get).toHaveBeenCalledWith(cache.getCacheKey('Staff', q), AUTH);
    });

    it('returns null on cache miss', async () => {
      cacheAdapter.get.mockResolvedValue(null);
      const result = await cache.get('Staff', makeParsedQuery());
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('stores value with the correct key and default TTL', async () => {
      const q = makeParsedQuery();
      const data = { data: [], meta: {} };
      cacheAdapter.set.mockResolvedValue(undefined);

      await cache.set('Staff', q, data);

      expect(cacheAdapter.set).toHaveBeenCalledWith(cache.getCacheKey('Staff', q), data, {
        db: CacheDbType.AUTH,
        ttl: 60,
      });
    });

    it('stores value with custom TTL', async () => {
      const q = makeParsedQuery();
      cacheAdapter.set.mockResolvedValue(undefined);

      await cache.set('Staff', q, {}, 120);

      expect(cacheAdapter.set).toHaveBeenCalledWith(
        expect.any(String),
        {},
        { db: CacheDbType.AUTH, ttl: 120 },
      );
    });
  });

  describe('invalidate', () => {
    it('deletes all keys matching the entity pattern', async () => {
      const keys = ['qe:cache:Staff:abc123', 'qe:cache:Staff:def456'];
      cacheAdapter.scanKeys.mockResolvedValue(keys);
      cacheAdapter.deleteMany.mockResolvedValue(undefined);

      await cache.invalidate('Staff');

      expect(cacheAdapter.scanKeys).toHaveBeenCalledWith('qe:cache:Staff:*', AUTH);
      expect(cacheAdapter.deleteMany).toHaveBeenCalledWith(keys, AUTH);
    });

    it('does not call deleteMany when no keys found', async () => {
      cacheAdapter.scanKeys.mockResolvedValue([]);

      await cache.invalidate('Staff');

      expect(cacheAdapter.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('key determinism across property ordering', () => {
    it('produces the same key regardless of object key insertion order', () => {
      const q1 = makeParsedQuery({ fields: { root: ['id', 'name'] } });
      const q2 = makeParsedQuery({ fields: { root: ['id', 'name'] } });
      expect(cache.getCacheKey('Staff', q1)).toBe(cache.getCacheKey('Staff', q2));
    });
  });
});
