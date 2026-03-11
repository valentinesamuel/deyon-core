# Production-Grade Query Engine — Implementation Plan

## Context

The Deyon BE project currently has a basic `findAndPaginate` utility (offset-pagination, simple AND/OR filters, ILIKE search). The goal is to replace this with a **production-grade query engine** that supports complex boolean expressions, relation traversal, cursor pagination, hybrid search, aggregations, query cost limits, Redis caching, and observability — designed to scale to 100M+ rows and 2000 RPS with p95 < 400ms.

The engine will live at `src/query-engine/` as a self-contained NestJS module integrated into the existing stack (TypeORM 0.3.27, PostgreSQL, ioredis, NestJS 11).

---

## Confirmed Design Decisions

| Decision | Choice |
|----------|--------|
| File naming | **camelCase** (`joinPlanner.ts`, `filterBuilder.ts`, `queryEngine.module.ts`) |
| Filter syntax | **Both**: `where=(DSL)` AND `filter[field][op]=value` bracket style — both compile to same AST |
| HAVING syntax | **Separate** `having=count(appointments)>5` parameter (not in `where=`) |
| Soft delete on JOINs | **All tables**: `deleted_at IS NULL` added to root AND every joined table |

---

## Final Folder Structure

```
src/query-engine/
├── index.ts                        # Public API barrel
├── queryEngine.module.ts           # NestJS module
├── queryEngine.service.ts          # Main orchestrator — execute()
│
├── types/
│   ├── ast.types.ts                # AST node interfaces
│   ├── query.types.ts              # QueryInput, ParsedQuery, SortDir, Operator
│   ├── result.types.ts             # QueryResult, CursorPage, CursorMeta
│   └── modelConfig.types.ts        # ModelQueryConfig (whitelists, limits)
│
├── lexer/
│   └── lexer.ts                    # Tokenizer for where=/having= strings
│
├── ast/
│   └── astNodes.ts                 # LogicalNode, ConditionNode, AggregateConditionNode, SearchNode
│
├── parser/
│   ├── parser.ts                   # Token[] → AST (recursive descent)
│   └── bracketParser.ts            # filter[field][op]=value → AST
│
├── validation/
│   ├── queryValidator.ts           # Whitelist enforcement, depth/join/filter limits
│   └── complexityScorer.ts         # Cost scoring (filter=1, join=3, search=5, agg=6)
│
├── planner/
│   ├── joinPlanner.ts              # Relation path → JoinSpec[] via TypeORM metadata
│   ├── filterPlanner.ts            # AST → FilterPlan (resolves alias+column per condition)
│   └── selectPlanner.ts            # fields[entity]=col1,col2 → per-alias column lists
│
├── sqlBuilder/
│   ├── queryBuilder.ts             # Main QB orchestrator (SelectQueryBuilder)
│   ├── filterBuilder.ts            # AST → QB .where/.andWhere/.orWhere (Brackets)
│   └── sortBuilder.ts              # sort= → QB .orderBy per alias
│
├── pagination/
│   └── cursorPagination.ts         # Encode/decode multi-column cursor + WHERE clause gen
│
├── search/
│   └── hybridSearch.ts             # FTS (to_tsvector) + Trigram (pg_trgm %) builders
│
├── aggregation/
│   └── aggregationBuilder.ts       # groupBy=, aggregate[fn]=, HAVING via having= param
│
├── optimizer/
│   └── queryOptimizer.ts           # Predicate pushdown, selectivity ordering, cost gate
│
├── cache/
│   └── queryCache.ts               # Redis cache, key = sha256(entity + stable query JSON)
│
└── analytics/
    └── queryAnalytics.ts           # Structured log: execTimeMs, joins, filters, rows, cacheHit
```

---

## Stack Integration Points

- **TypeORM**: `DataSource` injected into query-engine module. Use `em.getRepository(Entity).createQueryBuilder(alias)` for all queries.
- **SnakeCaseNamingStrategy**: DB columns are snake_case; entity props are camelCase. JoinPlanner must resolve via TypeORM metadata (`EntityMetadata.columns`, `RelationMetadata`).
- **Redis**: Inject existing `RedisService` from `src/shared/redis/redis.service.ts`. Use `setJson`/`getJson` for cache.
- **NestJS DI**: `QueryEngineModule` injects `DataSource` via `@InjectDataSource()`.
- **Soft deletes (all tables)**: QB must add `AND alias.deleted_at IS NULL` to every LEFT JOIN ON clause AND the root WHERE, unless `withDeleted=true` in the query options.

---

## Implementation Phases

---

### Phase 1 — Types + Lexer + AST Nodes + Parser
**Goal**: Turn both `where=` DSL strings and `filter[field][op]=value` bracket params into a unified typed AST.

#### Files to create:
- `src/query-engine/types/ast.types.ts`
- `src/query-engine/types/query.types.ts`
- `src/query-engine/types/result.types.ts`
- `src/query-engine/types/modelConfig.types.ts`
- `src/query-engine/lexer/lexer.ts`
- `src/query-engine/ast/astNodes.ts`
- `src/query-engine/parser/parser.ts`
- `src/query-engine/parser/bracketParser.ts`

#### Key Decisions:
- **Lexer tokens**: `LPAREN`, `RPAREN`, `AND`, `OR`, `IDENT` (dotted field), `OP`, `VALUE` (string/number/list), `EOF`.
- **Parser**: Recursive-descent. `parseExpression()` → OR → `parseTerm()` → AND → `parseFactor()` → `parseCondition()` or grouped `( expr )`.
- **BracketParser**: Accepts `Record<string, Record<string, string>>` (from parsed query string). Converts `{ status: { eq: 'active' }, age: { gte: '18' } }` into a flat `AND` `LogicalNode`. Merges with DSL AST if both present.
- **AST node types**:
  ```typescript
  type ASTNode = LogicalNode | ConditionNode | AggregateConditionNode;

  interface LogicalNode {
    type: 'AND' | 'OR';
    children: ASTNode[];
  }
  interface ConditionNode {
    type: 'CONDITION';
    field: string;         // dotted path: 'doctor.department.name'
    op: Operator;          // eq|ne|gt|gte|lt|lte|in|nin|between|like|ilike|isNull|notNull
    value: QueryValue;     // string | number | string[] | null
  }
  interface AggregateConditionNode {
    type: 'AGGREGATE';
    fn: 'count' | 'sum' | 'avg' | 'min' | 'max';
    field: string;
    op: Operator;
    value: number;
  }
  ```
- **Grammar** (from `query_engine_docs/04_query_grammar.md`):
  ```
  expression ::= term (OR term)*
  term       ::= factor (AND factor)*
  factor     ::= condition | "(" expression ")"
  condition  ::= field operator value
  field      ::= identifier ("." identifier)*
  ```
- **`ModelQueryConfig`**:
  ```typescript
  interface ModelQueryConfig {
    allowedFilters: string[];
    allowedSort: string[];
    allowedSearch: { field: string; type: 'fts' | 'tri' }[];
    allowedRelations: string[];
    allowedFields: string[];
    maxFilters?: number;             // default: 30
    maxJoins?: number;               // default: 8
    maxRelationDepth?: number;       // default: 4
    maxComplexityScore?: number;     // default: 50
    cacheTtlSeconds?: number;        // default: 60
  }
  ```

#### Checkpoint 1:
```bash
pnpm test:unit --reporter=verbose -- src/query-engine
```
Tests: DSL parsing `(a=1 AND b=2) OR c=3`, nested relations `doctor.department.name='rad'`, IN list, IS NULL, bracket style `filter[age][gte]=18`, malformed input → `ParseError`, empty `where=` → null AST.

---

### Phase 2 — Validation + Complexity Scoring
**Goal**: Reject invalid/dangerous queries before any DB access.

#### Files to create:
- `src/query-engine/validation/queryValidator.ts`
- `src/query-engine/validation/complexityScorer.ts`

#### Key Decisions:
- Validator **walks the AST**, extracts all unique field paths, checks every path against `allowedFilters`. Counts unique relation prefixes as join count. Rejects with `QueryValidationError extends BadRequestException` → `{ code: 'QUERY_VALIDATION_ERROR', message, details }`.
- **Complexity scoring**:
  | Operation   | Cost |
  |-------------|------|
  | filter      | 1    |
  | join        | 3    |
  | search      | 5    |
  | aggregation | 6    |
- Scorer sums costs across the entire query (where + search + groupBy + aggregates). If total > `maxComplexityScore`, throws `QueryTooComplexError`.
- Sort and include fields also validated against `allowedSort` and `allowedRelations`.

#### Checkpoint 2:
```bash
pnpm test:unit -- src/query-engine/validation
```
Tests: whitelist rejection, max filter count, depth limit (relation path segments > `maxRelationDepth`), complexity ceiling rejection, valid query passes through cleanly.

---

### Phase 3 — Join Planner + Filter Planner + Select Planner
**Goal**: Produce a deterministic, deduplicated join plan from all relation paths in the query.

#### Files to create:
- `src/query-engine/planner/joinPlanner.ts`
- `src/query-engine/planner/filterPlanner.ts`
- `src/query-engine/planner/selectPlanner.ts`

#### Key Decisions:
- **JoinPlanner** uses `DataSource.getMetadata(EntityClass).relations` to validate each relation segment, resolve join column, assign alias. Output: deduplicated `JoinSpec[]`.
  ```typescript
  interface JoinSpec {
    type: 'LEFT';
    parentAlias: string;
    relationProperty: string;  // TypeORM entity property name (camelCase)
    alias: string;             // 'root_doctor_department'
    depth: number;
    hasDeletedAt: boolean;     // whether to add AND alias.deleted_at IS NULL on JOIN
  }
  ```
  Alias strategy: `root` → `root_${relation1}` → `root_${relation1}_${relation2}` (all lowercase, `_`-joined).
- **FilterPlanner** walks AST, for each `ConditionNode` splits `field` path into `[...relations, column]`, registers joins in JoinPlanner, resolves the final `{ alias, column }` for each condition.
- **SelectPlanner** processes `fields[entityAlias]=col1,col2` into `{ alias → string[] }` map. Always ensures FK columns included for join integrity.
- **`include=`** parameter: parsed as explicit relation paths to LEFT JOIN and select all columns (not filtered).

#### Checkpoint 3:
```bash
pnpm test:unit -- src/query-engine/planner
```
Tests: single-level join, 4-level deep join, shared prefix deduplication (`doctor.name` + `doctor.department.id` → single `root_doctor` join), join limit rejection (> `maxJoins`).

---

### Phase 4 — SQL Builder + QueryEngineService + NestJS Module
**Goal**: Wire AST + Plans into TypeORM `SelectQueryBuilder`. First end-to-end query execution.

#### Files to create:
- `src/query-engine/sqlBuilder/queryBuilder.ts`
- `src/query-engine/sqlBuilder/filterBuilder.ts`
- `src/query-engine/sqlBuilder/sortBuilder.ts`
- `src/query-engine/queryEngine.service.ts`
- `src/query-engine/queryEngine.module.ts`
- `src/query-engine/index.ts`

#### Key Decisions:
- **FilterBuilder** visits AST recursively, emits `Brackets()` with `.andWhere` / `.orWhere` chains. Named params: `:qe_p0`, `:qe_p1`, ... (prefixed to avoid collision). Operator mapping:
  - `eq` → `alias.col = :p`
  - `in` → `alias.col IN (:...p)`
  - `nin` → `alias.col NOT IN (:...p)`
  - `between` → `alias.col BETWEEN :p0 AND :p1`
  - `isNull` → `alias.col IS NULL`
  - `notNull` → `alias.col IS NOT NULL`
  - `like`/`ilike` → `alias.col LIKE :p` / `ILIKE :p`
- **JOIN soft-delete**: Each `JoinSpec` with `hasDeletedAt=true` gets `AND alias.deleted_at IS NULL` appended to the LEFT JOIN ON condition.
- **Root soft-delete**: Always `.andWhere('root.deleted_at IS NULL')` unless `withDeleted=true`.
- **SortBuilder**: `sort=-date,doctor.name` → `{ alias: 'root', col: 'date', dir: 'DESC' }`, `{ alias: 'root_doctor', col: 'name', dir: 'ASC' }`. Applied via `.orderBy()` + `.addOrderBy()`.
- **`queryEngine.service.ts`**: `execute<T>(EntityClass, queryInput, config, entityManager?)` → `QueryResult<T>`.
- **`QueryEngineModule`**: Global-scoped, imports nothing from feature modules, injects `DataSource` and `RedisService`.

#### Checkpoint 4 (Integration):
```bash
pnpm test:integration -- src/query-engine
```
Real PostgreSQL via Testcontainers. Tests: simple equality filter, nested relation filter with auto-join, multi-column sort, field selection, soft-delete exclusion on root + joined tables.

---

### Phase 5 — Cursor Pagination
**Goal**: Stable, multi-column cursor-based pagination replacing offset pagination.

#### Files to create:
- `src/query-engine/pagination/cursorPagination.ts`

#### Key Decisions:
- **Cursor**: `base64url(JSON.stringify({ [sortField]: value, ... }))`. Always includes `id` as final tiebreaker if not already in sort list.
- **Direction logic** for `sort=-date,id` (DESC date, ASC id):
  ```sql
  (root.date < :cur_date)
  OR (root.date = :cur_date AND root.id > :cur_id)
  ```
  "Less than" for DESC fields, "Greater than" for ASC fields. For multi-column: nested OR+AND pattern expanding per column.
- **Response**:
  ```typescript
  interface CursorPage<T> {
    data: T[];
    meta: {
      nextCursor: string | null;
      prevCursor: string | null;
      hasMore: boolean;
      limit: number;
      total?: number;  // optional — requires COUNT(*) query
    }
  }
  ```
- Fetch `limit + 1` rows; if count = `limit + 1`, `hasMore = true`, drop the last row from `data`.

#### Checkpoint 5:
```bash
pnpm test:unit -- src/query-engine/pagination
```
Tests: encode/decode round-trip, single DESC col cursor WHERE, multi-col mixed-direction WHERE, `id` tiebreaker auto-injection, `hasMore` detection.

---

### Phase 6 — Hybrid Search
**Goal**: Full-text and trigram search support per column.

#### Files to create:
- `src/query-engine/search/hybridSearch.ts`

#### Key Decisions:
- Input: `search[doctor.name][fts]=john`, `search[notes][tri]=fever`.
- **FTS**: `to_tsvector('english', root_doctor.first_name) @@ plainto_tsquery('english', :q_fts_0)` via QB `.andWhere()`.
- **Trigram**: `root.notes % :q_tri_0` (requires `CREATE EXTENSION IF NOT EXISTS pg_trgm`). Configurable similarity threshold via `ModelQueryConfig.trigramThreshold` (default `0.3`).
- Both search conditions are ANDed with each other and with the main `where=` filter.
- `ModelQueryConfig.allowedSearch` is `{ field: string; type: 'fts' | 'tri' }[]` — strict per-field whitelist.
- **Index recommendation** added as a comment in code (engine does not create indexes; migrations handle that).

#### Checkpoint 6 (Integration):
```bash
pnpm test:integration -- src/query-engine/search
```
Tests: FTS match on text column, trigram fuzzy match, combined search + filter, unallowed search field rejection.

---

### Phase 7 — Aggregations
**Goal**: GROUP BY, aggregate functions (COUNT/SUM/AVG/MIN/MAX), HAVING clauses.

#### Files to create:
- `src/query-engine/aggregation/aggregationBuilder.ts`

#### Key Decisions:
- Input params: `groupBy=doctor.department.id`, `aggregate[count]=id`, `aggregate[avg]=salary`.
- `having=` is parsed by the **same Lexer + Parser** as `where=`, but with `AggregateConditionNode` support (`count(appointments)>5`). Parser detects `fn(field)` pattern in condition position.
- QB mapping:
  - `.select('root_doctor_department.id')` + `.addSelect('COUNT(root.id)', 'count_id')`.
  - `.groupBy('root_doctor_department.id')`.
  - `.having('COUNT(root.id) > :hv_0', { hv_0: 5 })`.
- Aggregation joins are registered in JoinPlanner the same way as filter joins.

#### Checkpoint 7 (Integration):
```bash
pnpm test:integration -- src/query-engine/aggregation
```
Tests: GROUP BY single col, GROUP BY nested relation col, COUNT + HAVING, multiple aggregates in same query.

---

### Phase 8 — Query Optimizer
**Goal**: Improve query plan quality before execution.

#### Files to create:
- `src/query-engine/optimizer/queryOptimizer.ts`

#### Key Decisions:
- **Predicate pushdown**: Filter conditions on a joined table → move to JOIN ON clause (converts LEFT JOIN + WHERE to INNER JOIN WHERE possible, reducing result set size).
- **Selectivity ordering**: Reorder AND-children by estimated selectivity: `eq > in > gte/lte > like > ilike`. Applied recursively on `LogicalNode` children.
- **EXISTS optimization**: When a filter condition traverses a relation that has no selected columns (join exists only for filtering), emit `EXISTS (SELECT 1 FROM ...)` instead of a JOIN.
- **Final cost gate**: After full query plan is assembled, run `complexityScorer` again on the resolved plan. Reject if over `maxComplexityScore`.
- Optimizer is a pure function: `optimize(QueryPlan): QueryPlan` — no side effects, easy to unit test.

#### Checkpoint 8:
```bash
pnpm test:unit -- src/query-engine/optimizer
```
Tests: predicate reorder (eq moves before ilike), EXISTS detection, no-op for already-optimal plans, cost gate rejection.

---

### Phase 9 — Observability + Redis Caching
**Goal**: Cache query results in Redis and log structured analytics per execution.

#### Files to create:
- `src/query-engine/analytics/queryAnalytics.ts`
- `src/query-engine/cache/queryCache.ts`

#### Key Decisions:
- **Cache key**: `qe:cache:${sha256(entityName + stableStringify(parsedQuery))}`. Uses `JSON.stringify` with sorted keys for determinism.
- **TTL**: `ModelQueryConfig.cacheTtlSeconds` (default 60s). Cached via `RedisService.setJson` / `getJson`.
- **Cache invalidation**: `QueryEngineService.invalidateCache(entityName)` uses `RedisService` SCAN to find and delete all keys matching `qe:cache:${entityName}:*`.
- **Analytics log** (NestJS `Logger` with `verbose` level):
  ```typescript
  {
    entity: string;
    execTimeMs: number;
    joinsUsed: number;
    filtersUsed: number;
    searchUsed: boolean;
    aggregationsUsed: boolean;
    rowsReturned: number;
    cacheHit: boolean;
    queryCost: number;
  }
  ```
- Analytics emitted on every execution (cache hit or miss). Cache hit skips DB query entirely.
- Inject existing `RedisService` from `src/shared/redis/redis.service.ts`.

#### Checkpoint 9:
```bash
pnpm test:unit -- src/query-engine/cache
pnpm test:unit -- src/query-engine/analytics
```
Tests: cache hit returns stored result without DB call, cache miss stores result with TTL, key determinism (same query → same key), analytics fields present on every execution.

---

### Phase 10 — Full Integration Wiring
**Goal**: Wire `QueryEngineModule` into the app. Run full test suite.

#### Files to modify:
- `src/app.module.ts` — add `QueryEngineModule` import
- `src/query-engine/index.ts` — export `QueryEngineService`, `ModelQueryConfig`, `QueryResult`, `CursorPage`

#### Checkpoint 10 (Full Suite):
```bash
pnpm test:unit
pnpm test:integration
```

---

### Phase 11 — Blog Post + Feature Guide
**Goal**: Generate two output documents.

#### Files to create:
- `query_engine_docs/BLOG_POST.md` — Long-form technical portfolio post. Covers: problem statement, architecture decisions (lexer/parser/AST rationale, why cursor over offset, EXISTS pushdown, hybrid search strategy), implementation challenges, performance characteristics, code samples, benchmark goals.
- `query_engine_docs/FEATURE_GUIDE.md` — Exhaustive feature reference. Covers: all query params, all filter operators with examples, DSL grammar cheatsheet, bracket filter syntax, sort syntax, cursor pagination, FTS + trigram search, aggregation + HAVING, field selection, include=, model config setup, index recommendations, error codes, example `curl` queries.

---

## Critical Files to Reference During Implementation

| File | Purpose |
|------|---------|
| `src/shared/redis/redis.service.ts` | Inject for caching (`setJson`, `getJson`, SCAN) |
| `src/shared/repositories/base.entity.ts` | Soft-delete field (`deletedAt`), base UUID id |
| `src/shared/repositories/snakeCaseNaming.strategy.ts` | Column name mapping reference |
| `src/shared/repositories/utility/findAndPaginate.ts` | Existing utility — do NOT break |
| `src/configs/typeorm.config.ts` | DataSource configuration |
| `src/modules/core/entities/` | Entity definitions for integration tests (Staff, Role, Dept, Permission) |
| `test/helpers/global-setup.ts` | Testcontainers: PostgreSQL 16 + Redis 7 |
| `test/helpers/database.helper.ts` | `truncateAllTables()` for test isolation |
| `vitest.unit.config.ts` | Unit test runner config |
| `vitest.integration.config.ts` | Integration test runner config |
| `query_engine_docs/04_query_grammar.md` | Formal grammar BNF |
| `query_engine_docs/05_ast_schema.md` | AST JSON shape reference |
| `query_engine_docs/06_join_planner.md` | Join algorithm reference |
| `query_engine_docs/07_cursor_pagination.md` | Cursor SQL pattern reference |
| `query_engine_docs/08_hybrid_search.md` | FTS + trigram SQL reference |

---

## Verification Strategy

Each phase ends with a checkpoint test command. After Phase 10:

```bash
# Full unit suite
pnpm test:unit

# Full integration suite (real PostgreSQL + Redis via Testcontainers)
pnpm test:integration

# Manual smoke test
curl "http://localhost:3000/staff?where=(role.name='admin')&sort=-createdAt&limit=10"
curl "http://localhost:3000/staff?filter[isActive][eq]=true&search[firstName][fts]=john&limit=5"
```

---

## Conventions to Follow

- **File naming**: camelCase (`joinPlanner.ts`, `queryEngine.module.ts`, `filterBuilder.ts`)
- **Error format**: `{ code: 'QUERY_VALIDATION_ERROR', message: string, details: object }` — all errors extend `BadRequestException`
- **Zero SQL injection**: Parameterized queries only (`:qe_p0` style). No string interpolation in SQL.
- **TypeScript strict**: No untyped `any`. Use `unknown` + narrowing where dynamic.
- **Mocking**: `mock<T>()` from `vitest-mock-extended` in unit tests
- **Integration tests**: Use `DataSource` injected from Testcontainers global context via `inject('pgConnectionString')`
- **Package manager**: pnpm
