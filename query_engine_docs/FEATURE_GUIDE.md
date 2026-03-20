# Query Engine Feature Guide

Complete reference for the `QueryEngineModule` query API.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Query Parameters Reference](#query-parameters-reference)
3. [Filter Operators](#filter-operators)
4. [DSL Grammar Cheatsheet](#dsl-grammar-cheatsheet)
5. [Bracket Filter Syntax](#bracket-filter-syntax)
6. [Sort Syntax](#sort-syntax)
7. [Cursor Pagination](#cursor-pagination)
8. [Full-Text and Trigram Search](#full-text-and-trigram-search)
9. [Aggregation and HAVING](#aggregation-and-having)
10. [Field Selection](#field-selection)
11. [Relation Inclusion](#relation-inclusion)
12. [Model Config Setup](#model-config-setup)
13. [Index Recommendations](#index-recommendations)
14. [Error Codes](#error-codes)
15. [Example curl Queries](#example-curl-queries)

---

## Quick Start

### 1. Define a ModelQueryConfig for your entity

```typescript
import { ModelQueryConfig } from 'src/query-engine';

const STAFF_QUERY_CONFIG: ModelQueryConfig = {
  allowedFilters: [
    'id', 'isActive', 'createdAt',
    'role.name', 'role.isActive',
    'department.id', 'department.name',
  ],
  allowedSort: ['createdAt', 'updatedAt', 'firstName', 'lastName'],
  allowedSearch: [
    { field: 'firstName', type: 'fts' },
    { field: 'notes', type: 'tri' },
  ],
  allowedRelations: ['role', 'department', 'role.permissions'],
  allowedFields: ['id', 'firstName', 'lastName', 'email', 'isActive', 'createdAt'],
  cacheTtlSeconds: 60,
};
```

### 2. Call the engine from your service

```typescript
import { QueryEngineService, QueryInput } from 'src/query-engine';

@Injectable()
export class StaffService {
  constructor(private readonly queryEngine: QueryEngineService) {}

  async list(queryInput: QueryInput) {
    return this.queryEngine.execute(Staff, queryInput, STAFF_QUERY_CONFIG);
  }

  async create(dto: CreateStaffDto) {
    const staff = await this.staffRepo.save(dto);
    await this.queryEngine.invalidateCache('Staff');
    return staff;
  }
}
```

### 3. Map controller params to QueryInput

```typescript
@Get()
list(@Query() query: Record<string, any>) {
  return this.staffService.list({
    where: query.where,
    filter: query.filter,
    sort: query.sort,
    limit: Number(query.limit) || 20,
    cursor: query.cursor,
    search: query.search,
    include: query.include,
    fields: query.fields,
    groupBy: query.groupBy,
    aggregate: query.aggregate,
    having: query.having,
    withDeleted: query.withDeleted === 'true',
  });
}
```

---

## Query Parameters Reference

| Parameter | Type | Description |
|-----------|------|-------------|
| `where` | `string` | DSL filter expression. See [DSL Grammar](#dsl-grammar-cheatsheet). |
| `filter` | `Record<string, Record<string, string>>` | Bracket-style filters. See [Bracket Filter Syntax](#bracket-filter-syntax). |
| `sort` | `string` | Comma-separated sort fields. Prefix `-` for DESC. |
| `limit` | `number` | Page size. Default `20`, max `1000`. |
| `cursor` | `string` | Opaque cursor from previous page's `meta.nextCursor`. |
| `search` | `Record<string, Record<string, string>>` | FTS or trigram search per field. |
| `include` | `string` | Comma-separated relation paths to LEFT JOIN and select. |
| `fields` | `Record<string, string>` | Restrict returned columns per alias. |
| `groupBy` | `string` | Comma-separated fields for GROUP BY. |
| `aggregate` | `Record<string, string>` | Aggregate functions: `{ fn: field }`. |
| `having` | `string` | HAVING clause DSL (same grammar as `where=`, with aggregate conditions). |
| `withDeleted` | `boolean` | Include soft-deleted records. Default `false`. |

---

## Filter Operators

### Comparison Operators

| Operator | DSL syntax | Bracket syntax | SQL equivalent |
|----------|-----------|----------------|----------------|
| Equal | `field = 'value'` | `filter[field][eq]=value` | `col = :p` |
| Not equal | `field != 'value'` | `filter[field][ne]=value` | `col != :p` |
| Greater than | `field > 10` | `filter[field][gt]=10` | `col > :p` |
| Greater or equal | `field >= 10` | `filter[field][gte]=10` | `col >= :p` |
| Less than | `field < 10` | `filter[field][lt]=10` | `col < :p` |
| Less or equal | `field <= 10` | `filter[field][lte]=10` | `col <= :p` |

### Set Operators

| Operator | DSL syntax | Bracket syntax | SQL equivalent |
|----------|-----------|----------------|----------------|
| IN | `field IN ('a','b','c')` | `filter[field][in]=a,b,c` | `col IN (:...p)` |
| NOT IN | `field NOT IN ('a','b')` | `filter[field][nin]=a,b` | `col NOT IN (:...p)` |
| BETWEEN | `field BETWEEN 10 AND 20` | `filter[field][between]=10,20` | `col BETWEEN :p0 AND :p1` |

### Null Operators

| Operator | DSL syntax | Bracket syntax | SQL equivalent |
|----------|-----------|----------------|----------------|
| Is null | `field IS NULL` | `filter[field][isNull]=1` | `col IS NULL` |
| Is not null | `field IS NOT NULL` | `filter[field][notNull]=1` | `col IS NOT NULL` |

### Text Operators

| Operator | DSL syntax | Bracket syntax | SQL equivalent |
|----------|-----------|----------------|----------------|
| LIKE | `field LIKE '%pattern%'` | `filter[field][like]=%pattern%` | `col LIKE :p` |
| ILIKE | `field ILIKE '%pattern%'` | `filter[field][ilike]=%pattern%` | `col ILIKE :p` |

---

## DSL Grammar Cheatsheet

The `where=` parameter accepts a boolean filter expression. Wrap multi-word values in single quotes.

### Basic Syntax

```
where=field=value
where=field!='value'
where=field>10
where=field IS NULL
where=field NOT IN ('a','b','c')
where=field BETWEEN 10 AND 20
where=field BETWEEN 10, 20
```

### Boolean Logic

```
# AND (implicit: no keyword needed between conditions at same level)
where=isActive=true AND role.name='admin'

# OR
where=status='active' OR status='pending'

# Grouped expressions
where=(status='active' OR status='pending') AND role.name='admin'

# Nested groups
where=((a=1 OR b=2) AND c=3) OR d=4
```

### Relation Traversal

Dot notation traverses relations:

```
where=role.name='admin'
where=role.department.name='engineering'
where=doctor.appointments.status='confirmed'
```

Each dot segment introduces a JOIN. The planner deduplicates automatically — `role.name='admin' AND role.isActive=true` produces a single `root_role` join.

### Value Types

| Type | Example |
|------|---------|
| String | `'admin'`, `'hello world'` |
| Number | `42`, `3.14`, `-5` |
| Boolean | `true`, `false` |
| Null | `NULL` |
| List | `('a','b','c')` for IN/NOT IN |
| Range | `10 AND 20` for BETWEEN |

---

## Bracket Filter Syntax

Bracket filters are equivalent to a flat AND expression. All conditions are ANDed together.

```
# URL: GET /staff?filter[isActive][eq]=true&filter[role.name][eq]=admin
# Equivalent where=: isActive=true AND role.name='admin'
```

HTTP query string format:

```
filter[fieldPath][operator]=value
```

For IN/NOT IN/BETWEEN, supply comma-separated values:

```
filter[role.name][in]=admin,staff,viewer
filter[salary][between]=50000,100000
```

**Mixing DSL and bracket**: Both can be used in the same request. The engine parses both independently and merges them into a single top-level AND:

```
GET /staff?where=(role.name='admin' OR role.name='staff')&filter[isActive][eq]=true
# Equivalent to: (role.name='admin' OR role.name='staff') AND isActive=true
```

---

## Sort Syntax

The `sort=` parameter accepts a comma-separated list of fields. Prefix a field with `-` for descending order.

```
sort=createdAt              # createdAt ASC
sort=-createdAt             # createdAt DESC
sort=-createdAt,lastName    # createdAt DESC, then lastName ASC
sort=role.name,-createdAt   # role.name ASC, then createdAt DESC
```

Fields must be in `ModelQueryConfig.allowedSort`. The engine resolves the alias for each field — `role.name` sorts on the `root_role` alias.

The `id` column is always appended as a final tiebreaker for cursor stability when not already present in the sort list.

---

## Cursor Pagination

Cursor pagination provides stable, efficient pagination regardless of table size.

### Response Shape

```typescript
{
  data: T[];
  meta: {
    nextCursor: string | null;  // pass as cursor= on the next request
    prevCursor: string | null;  // pass as cursor= to go backwards
    hasMore: boolean;           // true if there are more pages after this
    limit: number;              // effective limit used
  }
}
```

### Basic Usage

```
# First page
GET /staff?sort=-createdAt&limit=20

# Next page (use nextCursor from previous response)
GET /staff?sort=-createdAt&limit=20&cursor=eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTE1IiwiaWQiOiJ1dWlkIn0
```

### Cursor Internals

The cursor is `base64url(JSON.stringify({ sortField: lastValue, id: lastId }))`. It encodes the sort values of the **last row on the current page**. On the next request, the engine reconstructs the WHERE clause:

```sql
-- sort=-createdAt (DESC) with id tiebreaker (ASC)
WHERE (root.created_at < :cur_createdAt)
   OR (root.created_at = :cur_createdAt AND root.id > :cur_id)
ORDER BY root.created_at DESC, root.id ASC
LIMIT 21  -- fetches limit+1 to detect hasMore
```

### Rules

- The cursor is **opaque** — never parse or construct it manually.
- Cursors are **query-specific** — a cursor from one sort order cannot be used with a different sort order.
- Cursors are **short-lived** — they encode row values, which may shift if data is mutated.
- `withDeleted` must match between pages.

---

## Full-Text and Trigram Search

Search is a separate parameter from filtering and runs alongside `where=` conditions (ANDed together).

### FTS (Full-Text Search)

Best for: prose content, descriptions, notes, long text fields.

```
# URL parameter
search[firstName][fts]=john

# HTTP GET example
GET /staff?search[firstName][fts]=john
```

Generated SQL:

```sql
to_tsvector('english', root.first_name) @@ plainto_tsquery('english', :q_fts_0)
```

### Trigram Similarity

Best for: short strings, names, codes, reference numbers. Handles typos.

```
# URL parameter
search[notes][tri]=fever

# HTTP GET example
GET /staff?search[notes][tri]=fever
```

Generated SQL:

```sql
root.notes % :q_tri_0   -- default similarity threshold: 0.3
```

### Combined Search

Multiple search terms across multiple fields are all ANDed:

```
GET /staff?search[firstName][fts]=john&search[notes][tri]=fever
```

### Mixed Search + Filter

Search conditions are ANDed with `where=` conditions:

```
GET /staff?where=isActive=true&search[firstName][fts]=john
# SQL: WHERE isActive = true AND to_tsvector(...) @@ plainto_tsquery(...)
```

### Configuration

```typescript
const config: ModelQueryConfig = {
  allowedSearch: [
    { field: 'firstName', type: 'fts' },   // only FTS allowed on firstName
    { field: 'notes', type: 'tri' },        // only trigram allowed on notes
  ],
  trigramThreshold: 0.4,  // default 0.3; higher = stricter similarity match
};
```

Attempting to search a field not in `allowedSearch` throws `QueryValidationError`.

---

## Aggregation and HAVING

### GROUP BY

```
groupBy=department.id
groupBy=role.name,department.id    # comma-separated for multiple columns
```

### Aggregate Functions

```
aggregate[count]=id                 # COUNT(root.id) AS count_id
aggregate[sum]=salary               # SUM(root.salary) AS sum_salary
aggregate[avg]=salary               # AVG(root.salary) AS avg_salary
aggregate[min]=createdAt            # MIN(root.created_at) AS min_createdAt
aggregate[max]=createdAt            # MAX(root.created_at) AS max_createdAt
```

Multiple aggregates in one request:

```
GET /staff?groupBy=department.id&aggregate[count]=id&aggregate[avg]=salary
```

Generated SQL:

```sql
SELECT root_department.id, COUNT(root.id) AS count_id, AVG(root.salary) AS avg_salary
FROM staff root
LEFT JOIN departments root_department ON root_department.id = root.department_id
  AND root_department.deleted_at IS NULL
WHERE root.deleted_at IS NULL
GROUP BY root_department.id
```

### HAVING Clause

The `having=` parameter uses the same DSL grammar as `where=` but supports aggregate conditions:

```
having=count(id)>5
having=avg(salary)>=50000
having=count(appointments)>10 AND avg(salary)<100000
```

Aggregate condition syntax: `fn(field) operator value`

Supported functions: `count`, `sum`, `avg`, `min`, `max`

```
GET /staff?groupBy=department.id&aggregate[count]=id&having=count(id)>5
```

> **Note:** Aggregate conditions in HAVING support **comparison operators only**
> (`=`, `!=`, `>`, `>=`, `<`, `<=`). Set operators (IN, NOT IN, BETWEEN) and
> text operators (LIKE, ILIKE) are **not valid** in aggregate conditions.

---

## Field Selection

Restrict which columns are returned per alias to reduce payload size.

```
fields[root]=id,firstName,lastName,email
fields[root_role]=id,name
```

HTTP GET example:

```
GET /staff?include=role&fields[root]=id,firstName,email&fields[root_role]=id,name
```

**Alias naming convention**:
- Root entity: `root`
- Joined relations: `root_{relation}` → `root_role`, `root_department`
- Nested: `root_{rel1}_{rel2}` → `root_role_permissions`

When `fields` is not specified, all allowed columns are returned.

**FK columns are always included** for join integrity even if omitted from `fields`.

---

## Relation Inclusion

The `include=` parameter forces a relation to be LEFT JOINed and all columns selected from it — without needing a filter condition on that relation.

```
include=role
include=role,department
include=role.permissions    # nested relation
```

HTTP GET example:

```
GET /staff?include=role,department
```

Relations must be in `ModelQueryConfig.allowedRelations`. Requesting an unlisted relation throws `QueryValidationError`.

**Difference from filter-driven joins**:
- `where=role.name='admin'` → joins `role` for filtering, returns all root columns only
- `include=role` → joins `role` and returns both root and role columns

Both can be combined:

```
GET /staff?where=role.name='admin'&include=role
# Joins role once (deduplicated), selects from it (because include= requests it)
```

---

## Model Config Setup

`ModelQueryConfig` is the per-entity whitelist that controls what a caller can query.

```typescript
export interface ModelQueryConfig {
  allowedFilters: string[];        // field paths allowed in where= / filter[][]
  allowedSort: string[];           // fields allowed in sort=
  allowedSearch: {                 // fields allowed in search[][]
    field: string;
    type: 'fts' | 'tri';
  }[];
  allowedRelations: string[];      // relation paths allowed in include=
  allowedFields: string[];         // columns that may appear in fields[][]
  maxFilters?: number;             // default: 30
  maxJoins?: number;               // default: 8
  maxRelationDepth?: number;       // default: 4
  maxComplexityScore?: number;     // default: 50
  cacheTtlSeconds?: number;        // default: 60
  trigramThreshold?: number;       // default: 0.3
}
```

### Field Path Format

Field paths follow the entity property name (camelCase), not the DB column name (snake_case). The engine uses TypeORM metadata and the SnakeCaseNamingStrategy to resolve column names.

```typescript
allowedFilters: [
  'isActive',             // root entity field
  'role.name',            // relation field (one level)
  'role.department.name', // deeply nested
],
```

### Complexity Budget Tuning

Increase `maxComplexityScore` for power-user endpoints that need complex queries:

```typescript
const ADMIN_REPORT_CONFIG: ModelQueryConfig = {
  // ...
  maxFilters: 50,
  maxJoins: 12,
  maxComplexityScore: 100,
  cacheTtlSeconds: 300,  // longer TTL for expensive reports
};
```

### Cache Invalidation

After any write to an entity, invalidate its cached pages:

```typescript
await queryEngineService.invalidateCache('Staff');
```

This uses Redis SCAN to delete all keys matching `qe:cache:Staff:*`. Call it in your create/update/delete usecases.

---

## Index Recommendations

The query engine generates the SQL — index creation is handled by migrations.

### For cursor pagination (always needed)

```sql
-- Primary sort column + id
CREATE INDEX ON staff (created_at DESC, id ASC);
```

### For filter conditions (equality)

```sql
CREATE INDEX ON staff (is_active);
CREATE INDEX ON staff (role_id);  -- FK columns are often already indexed
```

### For FTS search

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- required for trigram

-- Full-text index on a text column
CREATE INDEX ON staff USING GIN (to_tsvector('english', first_name));

-- Composite FTS index for multi-column search
CREATE INDEX ON staff USING GIN (
  to_tsvector('english', first_name || ' ' || last_name)
);
```

### For trigram search

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX ON staff USING GIN (notes gin_trgm_ops);
```

### For range queries

```sql
CREATE INDEX ON staff (salary);
CREATE INDEX ON appointments (scheduled_at);
```

### For GROUP BY + aggregation

```sql
-- Index on the GROUP BY column (often a FK, already indexed)
CREATE INDEX ON staff (department_id);
```

---

## Error Codes

All query engine errors extend `BadRequestException` (HTTP 400) with this body shape:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable description",
  "details": {}
}
```

| Code | Trigger |
|------|---------|
| `QUERY_VALIDATION_ERROR` | Filter field not in `allowedFilters`, sort field not in `allowedSort`, relation not in `allowedRelations`, filter count > `maxFilters`, join count > `maxJoins`, relation depth > `maxRelationDepth` |
| `QUERY_TOO_COMPLEX` | Total complexity score exceeds `maxComplexityScore` |
| `PARSE_ERROR` | Malformed `where=` or `having=` DSL string |

### Error Examples

```json
// Disallowed filter field
{
  "code": "QUERY_VALIDATION_ERROR",
  "message": "Filter field 'salary' is not allowed",
  "details": { "field": "salary" }
}

// Too complex
{
  "code": "QUERY_TOO_COMPLEX",
  "message": "Query complexity score 67 exceeds maximum 50",
  "details": { "score": 67, "max": 50 }
}

// Parse error
{
  "code": "PARSE_ERROR",
  "message": "Unexpected token at position 12: expected value, got EOF",
  "details": {}
}
```

---

## Example curl Queries

### Simple equality filter

```bash
curl "http://localhost:3000/staff?where=isActive%3Dtrue&limit=10"
# where=isActive=true
```

### Bracket filter

```bash
curl "http://localhost:3000/staff?filter\[isActive\]\[eq\]=true&filter\[role.name\]\[eq\]=admin"
```

### Complex DSL filter

```bash
curl "http://localhost:3000/staff?where=(role.name%3D'admin'%20OR%20role.name%3D'staff')%20AND%20isActive%3Dtrue"
# where=(role.name='admin' OR role.name='staff') AND isActive=true
```

### Nested relation filter

```bash
curl "http://localhost:3000/staff?where=role.department.name%3D'engineering'"
# where=role.department.name='engineering'
```

### Sort descending + cursor pagination

```bash
# First page
curl "http://localhost:3000/staff?sort=-createdAt&limit=20"

# Next page (replace CURSOR with actual nextCursor value)
curl "http://localhost:3000/staff?sort=-createdAt&limit=20&cursor=CURSOR"
```

### Full-text search

```bash
curl "http://localhost:3000/staff?search\[firstName\]\[fts\]=john&limit=5"
```

### Trigram search

```bash
curl "http://localhost:3000/staff?search\[notes\]\[tri\]=fever&limit=10"
```

### Search + filter combined

```bash
curl "http://localhost:3000/staff?where=isActive%3Dtrue&search\[firstName\]\[fts\]=john&limit=5"
```

### Aggregation: count by department

```bash
curl "http://localhost:3000/staff?groupBy=department.id&aggregate\[count\]=id"
```

### Aggregation with HAVING

```bash
curl "http://localhost:3000/staff?groupBy=department.id&aggregate\[count\]=id&having=count(id)%3E5"
# having=count(id)>5
```

### Field selection

```bash
curl "http://localhost:3000/staff?include=role&fields\[root\]=id,firstName,email&fields\[root_role\]=id,name"
```

### IN operator

```bash
curl "http://localhost:3000/staff?filter\[role.name\]\[in\]=admin,staff,viewer"
```

### IS NULL filter

```bash
curl "http://localhost:3000/staff?filter\[deletedAt\]\[isNull\]=1"
```

### BETWEEN filter

```bash
curl "http://localhost:3000/staff?filter\[salary\]\[between\]=50000,100000"
```

### Include soft-deleted records

```bash
curl "http://localhost:3000/staff?withDeleted=true&where=isActive%3Dfalse"
```

### Multi-level sort

```bash
curl "http://localhost:3000/staff?sort=-createdAt,lastName&limit=20"
# createdAt DESC, then lastName ASC
```

### All parameters combined

```bash
curl "http://localhost:3000/staff?\
where=isActive%3Dfalse\
&sort=firstName%2C-createdAt\
&limit=3\
&include=role\
&groupBy=roleId\
&having=count(id)%3E5\
&withDeleted=false\
&filter%5BisActive%5D%5Beq%5D=true\
&filter%5BroleId%5D%5Beq%5D=YOUR_ROLE_ID\
&search%5BfirstName%5D%5Bfts%5D=John\
&search%5Bemail%5D%5Btri%5D=john%40\
&aggregate%5Bcount%5D=id"
# where=isActive=false
# sort=firstName,-createdAt     ← comma-separated, - prefix for DESC
# having=count(id)>5            ← fn(field) operator value
```

Test these combinations against GET /api/v1/staff after fixes:                            │
│                                                                                           │
│ ┌─────┬───────────────────────────────────────────────────────────┬─────────────────────┐ │
│ │  #  │                       Query Params                        │   Expected Result   │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │ 1   │ ?limit=5&sort=-createdAt                                  │ 200, paginated list │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │ 2   │ ?filter[firstName][eq]=John                               │ 200, filtered       │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │ 3   │ ?filter[isActive][eq]=true                                │ 200, filtered       │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │ 4   │ ?filter[role.name][eq]=Admin                              │ 200, filtered via   │ │
│ │     │                                                           │ join                │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │ 5   │ ?where=firstName = 'John'                                 │ 200, DSL filtered   │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │ 6   │ ?include=role,department                                  │ 200, with relations │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │ 7   │ ?fields[root]=id,firstName&include=role&fields[role]=name │ 200, field selected │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │ 8   │ ?fields[role]=name (no include=)                          │ 200, implicit join  │ │
│ │     │                                                           │ (tests fix #2)      │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │ 9   │ ?groupBy=roleId&aggregate[count]=id                       │ 200, raw            │ │
│ │     │                                                           │ aggregation data    │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │ 10  │ ?groupBy=roleId                                           │ 400, "groupBy       │ │
│ │     │                                                           │ requires aggregate" │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │ 11  │ ?having=count(id) > 5                                     │ 400, "having        │ │
│ │     │                                                           │ requires groupBy"   │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │ 12  │ ?search[firstName][fts]=John                              │ 200, FTS results    │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │ 13  │ ?search[email][tri]=john                                  │ 200, trigram        │ │
│ │     │                                                           │ results             │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │ 14  │ ?withDeleted=true                                         │ 200, includes       │ │
│ │     │                                                           │ soft-deleted        │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │ 15  │ ?withDeleted=false                                        │ 200, excludes       │ │
│ │     │                                                           │ soft-deleted        │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │     │                                                           │ 400 "Invalid query  │ │
│ │ 16  │ ?where=INVALID SYNTAX                                     │ syntax: ..." (not   │ │
│ │     │                                                           │ 500)                │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │ 17  │ ?filter[unknown][badop]=test                              │ 400 validation      │ │
│ │     │                                                           │ error (not 500)     │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │     │                                                           │ 400 "cursor not     │ │
│ │ 18  │ ?groupBy=roleId&aggregate[count]=id&cursor=abc            │ supported with      │ │
│ │     │                                                           │ aggregate"          │ │
│ ├─────┼───────────────────────────────────────────────────────────┼─────────────────────┤ │
│ │ 19  │ ?limit=5&cursor={from previous response}                  │ 200, next page      │ │
│ └─────┴───────────────────────────────────────────────────────────┴─────────────────────┘ │
│                                                                         