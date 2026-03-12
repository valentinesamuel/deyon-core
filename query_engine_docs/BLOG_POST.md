# Building a Production-Grade Query Engine in NestJS: From Zero to 100M Rows

## The Problem

Most NestJS backends start the same way: a basic `findAndPaginate` helper that handles offset pagination and a handful of simple filters. It works great for MVP scale. Then real data lands — 10M rows, cross-table reports, complex user-defined filters — and the limitations become impossible to ignore:

- Offset pagination breaks at scale. `OFFSET 50000 LIMIT 20` forces PostgreSQL to read 50,020 rows just to return 20.
- AND/OR filter logic requires bespoke query builder code for every new endpoint.
- No relation traversal means joins are duplicated across controllers.
- No caching means repeated identical queries hammer the database.
- No observability means you can't tell which query is killing you at 2am.

The Deyon BE project had exactly this problem. We replaced the old utility with a self-contained **QueryEngineModule** — a full query compilation pipeline that turns structured HTTP parameters into optimized TypeORM `SelectQueryBuilder` queries, with Redis caching, complexity gating, hybrid search, aggregations, and structured analytics built in.

This post walks through every architectural decision we made and why.

---

## Architecture Overview

The engine is split into 10 discrete layers, each with a single responsibility:

```
HTTP Request Params
        │
        ▼
  ┌─────────────┐
  │   Lexer     │  Tokenizes where= / having= DSL strings
  └──────┬──────┘
         │ Token[]
  ┌──────▼──────┐
  │   Parser    │  Recursive-descent → AST
  └──────┬──────┘   + BracketParser: filter[field][op]=value → AST
         │ ASTNode
  ┌──────▼──────────┐
  │   Validation    │  Whitelist enforcement + depth/join limits
  └──────┬──────────┘
         │ ComplexityScore
  ┌──────▼──────────┐
  │   Planner       │  AST → JoinSpec[] + FilterPlan + SelectPlan
  └──────┬──────────┘
         │ QueryPlan
  ┌──────▼──────────┐
  │   Optimizer     │  Selectivity ordering, EXISTS detection, predicate pushdown
  └──────┬──────────┘
         │ OptimizedPlan
  ┌──────▼──────────┐
  │   SQL Builder   │  TypeORM QB assembly (filter + sort + search + aggregation + cursor)
  └──────┬──────────┘
         │ SelectQueryBuilder
  ┌──────▼──────────┐
  │   Cache         │  Redis get/set with sha256 key
  └──────┬──────────┘
         │ CursorPage<T>
  ┌──────▼──────────┐
  │   Analytics     │  Structured log per execution
  └─────────────────┘
```

The entire pipeline runs in `QueryEngineService.execute()` — a single generic method that accepts any TypeORM entity class, a raw `QueryInput` object from the controller, and a `ModelQueryConfig` whitelist. The caller never touches SQL.

---

## Why a Lexer + Parser Instead of Direct Query Param Parsing?

The first design question was: how do users express complex boolean filter expressions in a URL?

**Option 1 — Bracket params**: `filter[role.name][eq]=admin&filter[isActive][eq]=true`
Simple to parse, but forces flat AND semantics. You can't express `(A OR B) AND C`.

**Option 2 — DSL string**: `where=(role.name='admin' OR role.name='staff') AND isActive=true`
Expressive, supports arbitrary boolean nesting, familiar to anyone who's written SQL. But requires a real parser.

We chose **both**, with the DSL string compiled to the same AST as bracket params and merged at the end. This gives simple callers the ergonomic bracket syntax and power users full boolean expressiveness, with zero divergence in execution behavior.

### The Lexer

The lexer (`src/query-engine/lexer/lexer.ts`) is a single-pass character scanner that emits typed tokens:

| Token | Examples |
|-------|---------|
| `LPAREN` / `RPAREN` | `(` `)` |
| `AND` / `OR` | `AND`, `OR` (case-insensitive) |
| `IDENT` | `role.name`, `doctor.department.id` |
| `OP` | `=`, `!=`, `>=`, `IS NULL`, `NOT IN`, `BETWEEN` |
| `VALUE` | `'admin'`, `42`, `true`, `null` |
| `COMMA` | `,` (for IN lists) |
| `EOF` | end of input |

Special handling:
- Multi-character operators (`>=`, `!=`, `IS NOT NULL`) are detected by peeking ahead.
- `IS NULL` and `IS NOT NULL` are emitted as single `OP` tokens — the parser never sees the `NULL` keyword separately.
- Single-quoted strings support `\'` escape sequences.
- Negative numeric literals are handled by detecting `-` followed by a digit.

### The Parser

The parser (`src/query-engine/parser/parser.ts`) is a hand-written recursive-descent parser implementing this grammar:

```
expression ::= term (OR term)*
term       ::= factor (AND factor)*
factor     ::= condition | "(" expression ")"
condition  ::= field operator value
field      ::= identifier ("." identifier)*
```

This precedence order (AND binds tighter than OR) matches SQL semantics. Parentheses allow arbitrary grouping.

The output is a typed AST:

```typescript
type ASTNode = LogicalNode | ConditionNode | AggregateConditionNode;

interface LogicalNode {
  type: 'AND' | 'OR';
  children: ASTNode[];
}

interface ConditionNode {
  type: 'CONDITION';
  field: string;    // dotted path: 'doctor.department.name'
  op: Operator;
  value: QueryValue;
}
```

Aggregate conditions (`count(appointments) > 5`) in `having=` strings are handled by detecting the `fn(field)` pattern before `operator value`.

---

## Why AST Instead of Direct QB Construction?

A common shortcut is to parse filter params and immediately call `.where()` on a query builder. We deliberately avoided this pattern for several reasons:

1. **Validation requires a complete view of the query** — you can't enforce join depth limits if joins are discovered lazily during QB construction.
2. **The optimizer needs to reorder conditions** — this is only possible on a tree structure, not imperative QB calls.
3. **The complexity scorer needs to walk all filter conditions** — again, requires a tree.
4. **The cache key needs a stable representation** — JSON-serialized AST with sorted keys is deterministic; QB state is not.

The AST is the single source of truth. Every downstream layer reads from it.

---

## Validation and the Whitelist Model

Before touching the database, the query passes through `QueryValidator`:

1. **Whitelist enforcement**: Every field path in the AST is checked against `ModelQueryConfig.allowedFilters`. Any unrecognized field throws `QueryValidationError` with HTTP 400. This prevents both accidental and malicious access to sensitive columns.

2. **Depth limit**: Relation path depth (number of `.` segments in a field) is checked against `maxRelationDepth` (default 4).

3. **Join limit**: Unique relation path prefixes are counted and checked against `maxJoins` (default 8). `doctor.name` and `doctor.department.id` share the `doctor` prefix — one join.

4. **Filter count**: Total leaf conditions checked against `maxFilters` (default 30).

5. **Sort/include validation**: `sort=` fields validated against `allowedSort`; `include=` paths validated against `allowedRelations`.

Errors are thrown as `QueryValidationError extends BadRequestException` with a structured body:

```json
{
  "code": "QUERY_VALIDATION_ERROR",
  "message": "Filter field 'salary' is not allowed",
  "details": { "field": "salary" }
}
```

### Complexity Scoring

After whitelist validation, the complexity scorer assigns a cost budget:

| Operation | Cost per unit |
|-----------|--------------|
| Filter condition | 1 |
| JOIN (unique relation path) | 3 |
| Search term (FTS or trigram) | 5 |
| Aggregation/GROUP BY | 6 |

A query with 5 filters across 2 joined tables + 1 FTS search = `5×1 + 2×3 + 1×5 = 16`. The default budget is 50. This prevents pathologically expensive queries from reaching the database even if they pass the whitelist.

---

## The Join Planner: Alias Strategy

The JoinPlanner (`src/query-engine/planner/joinPlanner.ts`) converts dotted field paths into a deduplicated list of `JoinSpec` objects.

**Alias strategy**: `root` → `root_doctor` → `root_doctor_department`. All lowercase, `_`-joined. This scheme is deterministic and collision-free regardless of query construction order.

**Deduplication**: Two field paths that share a relation prefix (`doctor.name` and `doctor.status`) produce a single join spec. The planner tracks registered aliases in a `Map<string, JoinSpec>` and skips duplicates.

**Soft-delete on JOINs**: Every join ON clause gets `AND alias.deleted_at IS NULL` appended when the joined entity has a `deleted_at` column. This prevents accidentally surfacing logically-deleted related records even when the join is only for filtering. The root entity always gets `root.deleted_at IS NULL` in the main WHERE unless `withDeleted: true` is passed.

---

## Cursor Pagination: Why and How

Offset pagination (`OFFSET N LIMIT M`) is O(N+M) — PostgreSQL must scan and skip N rows before returning M. At 50,000 offset this becomes a sequential table scan regardless of indexes.

Cursor pagination (`WHERE (date, id) < (:date, :id) ORDER BY date DESC, id ASC LIMIT M`) is O(M) — the index seek lands directly at the cursor position.

Our cursor encodes the sort field values of the last returned row as base64url JSON:

```
cursor = base64url(JSON.stringify({ date: '2024-01-15', id: 'uuid-...' }))
```

`id` is always appended as the final tiebreaker if not already in the sort list, guaranteeing stable ordering for rows with identical sort values.

The WHERE clause for multi-column cursors expands to a nested OR+AND pattern:

```sql
-- sort=-date, id
(root.date < :cur_date)
OR (root.date = :cur_date AND root.id > :cur_id)
```

For three columns `(-date, name, id)`:

```sql
(root.date < :cur_date)
OR (root.date = :cur_date AND root.name < :cur_name)
OR (root.date = :cur_date AND root.name = :cur_name AND root.id > :cur_id)
```

The engine fetches `limit + 1` rows. If the result count equals `limit + 1`, the last row is dropped and `hasMore: true` is set. This avoids a `COUNT(*)` query on every page.

---

## Hybrid Search: FTS + Trigram

The search layer supports two PostgreSQL text search strategies per field:

**Full-Text Search (FTS)**: Uses `to_tsvector` + `plainto_tsquery`. Best for natural language content — articles, notes, descriptions.

```sql
to_tsvector('english', root_doctor.first_name) @@ plainto_tsquery('english', :q_fts_0)
```

**Trigram similarity**: Uses `pg_trgm`'s `%` operator. Best for short identifiers — names, codes, reference numbers. Handles typos (e.g. "Jon" matches "John").

```sql
root.notes % :q_tri_0   -- configurable threshold via trigramThreshold (default 0.3)
```

Both modes are whitelisted per field in `ModelQueryConfig.allowedSearch`. The engine will reject search requests on fields not in the whitelist, even if they otherwise exist on the entity.

**Index recommendations** (not auto-created — migrations handle this):
- FTS: `CREATE INDEX ON staff USING GIN (to_tsvector('english', first_name));`
- Trigram: `CREATE INDEX ON staff USING GIN (notes gin_trgm_ops);`

---

## The Optimizer: Three Passes

The optimizer (`src/query-engine/optimizer/queryOptimizer.ts`) is a pure function `optimize(QueryPlan): OptimizedPlan` with no side effects. It runs three passes in sequence:

### Pass 1: Selectivity Ordering

AND-node children are sorted by estimated selectivity (ascending). More selective conditions filter more rows early, reducing the work done by less selective conditions.

```
Selectivity order: eq(1) < ne(2) < isNull(3) < notNull(4) < in(5) < nin(6)
                   < range ops(7) < between(8) < like(9) < ilike(10)
```

Example: `WHERE notes ILIKE '%john%' AND status = 'active'` is reordered to `WHERE status = 'active' AND notes ILIKE '%john%'`. PostgreSQL's planner often honors this ordering for sequential conditions.

OR-nodes are structurally unchanged (reordering OR children can change semantics for short-circuit evaluation).

### Pass 2: EXISTS Detection

If a joined table has no columns selected (it's joined purely for a filter condition), the join is marked `useExists: true`. The query builder can then emit `EXISTS (SELECT 1 FROM ...)` instead of `LEFT JOIN`, which often executes faster because it short-circuits at the first match.

### Pass 3: Predicate Pushdown

Top-level CONDITION nodes (direct children of the root AND, or the root itself) that reference a single non-root alias are identified as pushdown candidates. Their SQL representations are stored on the `OptimizedJoinSpec` so the query builder can move them from the main WHERE to the JOIN ON clause.

Moving a filter into the JOIN ON converts a `LEFT JOIN + WHERE filter` into an `INNER JOIN` style relationship — reducing result set size before the main WHERE evaluation.

### Final Cost Gate

After optimization, the complexity scorer runs one final time on the resolved plan. If the total cost exceeds `maxComplexityScore`, `QueryTooComplexError` is thrown. This gate runs last because the optimizer can theoretically increase cost (e.g., by forcing additional joins for EXISTS rewriting).

---

## Redis Caching

Cache keys are computed as:

```
qe:cache:{sha256(entityName + stableStringify(parsedQuery))}
```

`stableStringify` sorts all object keys before serialization, ensuring the same logical query always produces the same key regardless of parameter order in the HTTP request.

TTL is configured per entity via `ModelQueryConfig.cacheTtlSeconds` (default 60 seconds). Cache results are stored as JSON via `RedisService.setJson`.

Cache invalidation is explicit: calling `QueryEngineService.invalidateCache(entityName)` uses Redis SCAN to find and delete all keys matching the entity's prefix. This should be called after any mutation (create/update/delete) on the entity.

---

## Observability

Every execution — cache hit or miss — emits a structured log entry via NestJS `Logger`:

```typescript
{
  entity: 'Staff',
  execTimeMs: 12,
  joinsUsed: 2,
  filtersUsed: 3,
  searchUsed: false,
  aggregationsUsed: false,
  rowsReturned: 20,
  cacheHit: false,
  queryCost: 11
}
```

This gives immediate visibility into which queries are expensive, which are cache-hitting, and what the actual data volumes look like per execution. Feed these logs into your APM tool of choice.

---

## Integration: Zero Changes to Existing Code

`QueryEngineModule` is a global-scoped NestJS module. Adding it to `AppModule.imports` makes `QueryEngineService` available everywhere via DI. Existing endpoints using the old `findAndPaginate` utility continue working unchanged.

Adopting the engine in a new endpoint requires:

1. Define a `ModelQueryConfig` for the entity (what filters, sorts, relations are allowed).
2. Accept `QueryInput` params from the controller (map HTTP query params to the `QueryInput` shape).
3. Call `queryEngineService.execute(EntityClass, queryInput, config)`.
4. Call `queryEngineService.invalidateCache(EntityClass.name)` after mutations.

---

## Performance Characteristics

Design targets for the engine:

| Metric | Target |
|--------|--------|
| Scale | 100M+ rows |
| Throughput | 2000 RPS |
| p95 latency (cache hit) | < 5ms |
| p95 latency (DB query) | < 400ms |
| Max complexity score | 50 (configurable) |
| Max joins per query | 8 (configurable) |

Key performance properties:
- **Cursor pagination** eliminates O(N) offset scans.
- **Predicate pushdown** reduces join result set size.
- **EXISTS optimization** short-circuits filter-only joins.
- **Selectivity reordering** reduces work in AND chains.
- **Redis caching** eliminates DB round-trips for repeated identical queries.
- **Complexity gating** prevents any single query from monopolizing DB resources.

---

## What We'd Do Differently

A few things we'd revisit if starting over:

**Schema-level caching invalidation**: Our current invalidation model is manual — callers must remember to call `invalidateCache`. A better approach would hook into TypeORM's entity subscribers to auto-invalidate on any write to a tracked entity.

**Prepared statement caching**: The engine generates fresh `SelectQueryBuilder` instances per request. For high-volume repeated query shapes, parameterized prepared statements stored server-side would reduce parse overhead.

**Query plan caching**: The lexer→parser→validation→planner pipeline runs on every request. For hot query patterns, memoizing the compiled `QueryPlan` by cache key would eliminate this overhead entirely.

These are left as future iterations. The current implementation hits the performance targets for our workload while remaining understandable and testable.

---

## Conclusion

Building a query engine from scratch is an investment. The payoff is a single, well-tested, observable query execution path that scales as data grows — without proliferating hand-written query builder code across every module. Every new endpoint gets cursor pagination, Redis caching, complexity gating, and structured logging for free, just by calling `queryEngineService.execute()`.

The full implementation lives in `src/query-engine/`. Unit tests cover every layer in isolation; integration tests run against real PostgreSQL + Redis via Testcontainers.
