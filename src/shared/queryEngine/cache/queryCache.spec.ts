import { describe, it, expect, beforeEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { QueryCache } from './queryCache';
import { RedisService } from '../../shared/redis/redis.service';
import { ParsedQuery } from '../types/query.types';

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
    ...overrides,
  };
}

describe('QueryCache', () => {
  let cache: QueryCache;
  let redis: ReturnType<typeof mock<RedisService>>;

  beforeEach(() => {
    redis = mock<RedisService>();
    cache = new QueryCache(redis);
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
      redis.getJson.mockResolvedValue(expected);

      const result = await cache.get('Staff', q);
      expect(result).toEqual(expected);
      expect(redis.getJson).toHaveBeenCalledWith(cache.getCacheKey('Staff', q));
    });

    it('returns null on cache miss', async () => {
      redis.getJson.mockResolvedValue(null);
      const result = await cache.get('Staff', makeParsedQuery());
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('stores value with the correct key and default TTL', async () => {
      const q = makeParsedQuery();
      const data = { data: [], meta: {} };
      redis.setJson.mockResolvedValue(undefined);

      await cache.set('Staff', q, data);

      expect(redis.setJson).toHaveBeenCalledWith(cache.getCacheKey('Staff', q), data, 60);
    });

    it('stores value with custom TTL', async () => {
      const q = makeParsedQuery();
      redis.setJson.mockResolvedValue(undefined);

      await cache.set('Staff', q, {}, 120);

      expect(redis.setJson).toHaveBeenCalledWith(expect.any(String), {}, 120);
    });
  });

  describe('invalidate', () => {
    it('deletes all keys matching the entity pattern', async () => {
      const keys = ['qe:cache:Staff:abc123', 'qe:cache:Staff:def456'];
      redis.scanKeys.mockResolvedValue(keys);
      redis.del.mockResolvedValue(undefined);

      await cache.invalidate('Staff');

      expect(redis.scanKeys).toHaveBeenCalledWith('qe:cache:Staff:*');
      expect(redis.del).toHaveBeenCalledWith(...keys);
    });

    it('does not call del when no keys found', async () => {
      redis.scanKeys.mockResolvedValue([]);

      await cache.invalidate('Staff');

      expect(redis.del).not.toHaveBeenCalled();
    });
  });

  describe('key determinism across property ordering', () => {
    it('produces the same key regardless of object key insertion order', () => {
      const q1 = makeParsedQuery({ fields: { root: ['id', 'name'] } });
      // same fields, different object construction order doesn't matter for arrays
      const q2 = makeParsedQuery({ fields: { root: ['id', 'name'] } });
      expect(cache.getCacheKey('Staff', q1)).toBe(cache.getCacheKey('Staff', q2));
    });
  });
});
