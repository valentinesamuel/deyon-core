# How we made sure the same search always hits the cache, even when the URL params are shuffled

Two users send these requests one second apart:

```
User A: GET /staff?filter[status][eq]=active&filter[role][eq]=admin&sort=createdAt
User B: GET /staff?filter[role][eq]=admin&filter[status][eq]=active&sort=createdAt
```

These ask for exactly the same data. The filters are identical, just written in a different order. If your cache keys are based on the raw query string, you get two cache misses and two identical database queries. On a busy API, this kind of duplication adds up fast.

We needed cache keys that produce the same output regardless of how the input is ordered.

## The lunch order analogy

You walk into a deli and order: "burger, fries, no pickles." Your coworker orders: "no pickles, fries, burger." The kitchen should recognize these as the same order. But if the ticket system writes down exactly what each person said, it looks like two different orders.

The fix is the same in both cases: sort the items into a canonical order before comparing. "Burger, fries, no pickles" and "no pickles, fries, burger" both become "burger, fries, no pickles" once sorted alphabetically.

## Step 1: Stable stringification

JavaScript's `JSON.stringify` does not guarantee key order. `{ role: 'admin', status: 'active' }` and `{ status: 'active', role: 'admin' }` might produce different strings depending on insertion order.

Our `stableStringify` function fixes this by recursively sorting all object keys before serializing:

```typescript
function stableStringify(value): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  const sorted = Object.keys(value).sort();
  const pairs = sorted.map(
    (key) => JSON.stringify(key) + ':' + stableStringify(value[key])
  );
  return '{' + pairs.join(',') + '}';
}
```

```
Input A: { status: 'active', role: 'admin' }
Input B: { role: 'admin', status: 'active' }

         stableStringify(A) --> {"role":"admin","status":"active"}
         stableStringify(B) --> {"role":"admin","status":"active"}
                                          ^
                                     identical output
```

No matter how the keys are ordered in the original object, the output is always the same.

## Step 2: Hash and build the key

Once we have a stable string, we hash it with SHA-256 and combine it with the entity name:

```typescript
function buildCacheKey(entityName, parsedQuery): string {
  const hash = createHash('sha256')
    .update(stableStringify(parsedQuery))
    .digest('hex');
  return `${CACHE_PREFIX}:${entityName}:${hash}`;
}
```

The resulting key looks like:

```
qe:cache:Staff:a3f9b2c8e1d7...4f6a
```

| Component | Value | Purpose |
|-----------|-------|---------|
| `qe:cache` | Fixed prefix | Namespace all query engine cache keys |
| `Staff` | Entity name | Scope invalidation to one entity type |
| `a3f9b2c8...` | SHA-256 hash | Unique fingerprint of the parsed query |

The full flow:

```
User A's request                     User B's request
filter[status][eq]=active            filter[role][eq]=admin
filter[role][eq]=admin               filter[status][eq]=active
sort=createdAt                       sort=createdAt
        |                                    |
        v                                    v
   Parse into query object             Parse into query object
        |                                    |
        v                                    v
   stableStringify()                   stableStringify()
        |                                    |
        v                                    v
   {"role":"admin",                    {"role":"admin",
    "sort":"createdAt",                 "sort":"createdAt",
    "status":"active"}                  "status":"active"}
        |                                    |
        +------ identical string ------+
                      |
                      v
                   SHA-256
                      |
                      v
        qe:cache:Staff:a3f9b2c8...
                      |
                      v
               Same cache key --> cache HIT for User B
```

## Cache invalidation

When data changes, we need to clear cached results for that entity. Since all Staff query cache keys share the same prefix, we can scan and delete them:

```typescript
async invalidate(entityName: string): Promise<void> {
  const pattern = `${CACHE_PREFIX}:${entityName}:*`;
  const keys = await this.redis.scanKeys(pattern);
  if (keys.length > 0) {
    await this.redis.del(...keys);
  }
}
```

```
invalidate('Staff')
        |
        v
SCAN for keys matching "qe:cache:Staff:*"
        |
        v
Found: [ "qe:cache:Staff:a3f9b2...",
         "qe:cache:Staff:7d1e4a...",
         "qe:cache:Staff:f8c2b1..." ]
        |
        v
DEL all three keys
```

This is a brute-force approach: any write to the Staff table clears every cached Staff query. It is simple and correct, though not granular. A single row update wipes caches that might not have included that row. For our use case, with a 60-second TTL, the trade-off is acceptable.

## TTL as a safety net

Every cache entry expires after 60 seconds by default:

```typescript
const DEFAULT_TTL = 60; // seconds
```

Even if invalidation misses an edge case, stale data lives for at most one minute. This is a deliberate choice. A shorter TTL means fresher data but more cache misses. A longer TTL means better hit rates but staler results.

## The trade-off with SHA-256

SHA-256 is deterministic (same input always produces same output), fast, and produces fixed-length keys. But it is a one-way hash. You cannot look at `qe:cache:Staff:a3f9b2c8...` and figure out which query it represents without recomputing the hash from the original query.

This makes debugging harder. If you see a suspicious cache key in Redis, you cannot reverse-engineer its contents. In practice, we debug by logging the query alongside the key at the time of caching, so the mapping is available in application logs even if it is not derivable from the key itself.

| Property | Benefit |
|----------|---------|
| Deterministic | Same query always maps to same key |
| Fixed length | Keys are always 64 hex characters, regardless of query complexity |
| Collision-resistant | Astronomically unlikely that two different queries produce the same key |
| One-way | Cannot inspect key contents (use logs instead) |

The overall pattern is straightforward: normalize the input, hash it, prefix it. The normalization step (stable stringification) is the part that makes the whole thing work. Without it, the same query in different key orders would produce different hashes, and your cache hit rate would quietly suffer without any obvious errors.
