# How we built a speed bump for database queries before they get out of hand

A user sends this request to your API:

```
GET /staff?filter=status='active' AND doctor.department='cardiology'
          &search=bio:neurosurgery
          &include=doctor,doctor.department,appointments
          &sort=-createdAt
```

That looks reasonable at first glance. But look at what the database has to do: three LEFT JOINs, a full-text search across the `bio` column, a filter condition, and a sort. On a table with 500,000 rows and no pre-warmed cache, this query could take seconds.

Now imagine ten users send similar queries at the same time. Your database connection pool fills up, and every other API endpoint in your application starts queueing.

We needed a way to stop expensive queries before they reach the database.

## The taxi meter analogy

Think of a taxi with a fare meter. Every operation in your query adds to the fare:

```
+----------------------------------+
|         QUERY FARE METER         |
+----------------------------------+
| Filters (x2)          2 x 1 = 2 |
| Joins (x3)            3 x 3 = 9 |
| Text search (x1)      1 x 5 = 5 |
| Aggregations (x0)     0 x 6 = 0 |
+----------------------------------+
| TOTAL                        16  |
| BUDGET                       20  |
| STATUS              [ ALLOWED ] |
+----------------------------------+
```

If the total exceeds the budget, the ride is denied before the engine starts. No query hits the database.

## The cost table

Each type of operation has a weight reflecting its relative expense:

```typescript
const COSTS = {
  filter: 1,       // per leaf condition
  join: 3,         // per unique relation prefix
  search: 5,       // per search term
  aggregation: 6,  // if any aggregates/groupBy present
};
```

| Operation | Cost | Why |
|-----------|------|-----|
| Filter | 1 | A WHERE condition on an indexed column is cheap |
| Join | 3 | Each join multiplies the row set and adds I/O |
| Search | 5 | Full-text and trigram searches scan large text columns |
| Aggregation | 6 | GROUP BY requires sorting/hashing the entire result set |

These are not arbitrary. Joins are roughly 3x more expensive than a simple filter because the database must read from an additional table and match rows. Search is more expensive still because text indexing involves parsing and matching against token dictionaries or trigram sets.

## How scoring works

The `scoreComplexity` function counts each operation type and multiplies by its cost:

```typescript
export function scoreComplexity(query): ComplexityBreakdown {
  const filters = countLeafConditions(query.ast);
  const joins = countUniqueRelationPrefixes(query.joins);
  const search = query.searchTerms?.length ?? 0;
  const aggregations = query.groupBy?.length ? 1 : 0;

  const total =
    filters * COSTS.filter +
    joins * COSTS.join +
    search * COSTS.search +
    aggregations * COSTS.aggregation;

  return { filters, joins, search, aggregations, total };
}
```

For the query at the top of this post:

```
Filters:      2 conditions (status, doctor.department)  -->  2 x 1 = 2
Joins:        3 relations (doctor, department, appointments) -->  3 x 3 = 9
Search:       1 term (bio:neurosurgery)                -->  1 x 5 = 5
Aggregations: 0                                        -->  0 x 6 = 0
                                                           --------
Total:                                                         16
```

## The gate

The complexity score is the last of eight validation checks in the query validator. If the score exceeds the configured maximum, the request is rejected:

```
Request arrives
    |
    v
[1] Check filter fields against whitelist
[2] Check filter count <= maxFilters
[3] Check relation depth per field
[4] Check join count <= maxJoins
[5] Check sort fields against whitelist
[6] Check include relations against whitelist
[7] Check search fields against whitelist
[8] Check complexity score <= maxComplexityScore   <-- the gate
    |
    v
Passed all 8? --> Build and execute the query
Failed any?   --> Return 400 with details
```

When the score exceeds the budget:

```json
{
  "code": "QUERY_TOO_COMPLEX",
  "message": "Query complexity score 28 exceeds maximum allowed 20",
  "details": {
    "score": 28,
    "max": 20,
    "breakdown": {
      "filters": 4,
      "joins": 5,
      "search": 2,
      "aggregations": 0
    }
  }
}
```

The response includes the breakdown so the caller can see which part of their query is the most expensive and adjust. Maybe they do not need all five joins, or maybe one search term is enough.

## Setting the budget

The `maxComplexityScore` is configured per entity, because different tables have different sizes and index coverage:

| Entity | maxComplexityScore | Why |
|--------|--------------------|-----|
| Staff | 20 | Moderate size, several relations |
| AuditLog | 10 | Huge table, must be restrictive |
| Role | 30 | Small table, joins are cheap |

You can also vary the budget by user tier. An admin dashboard might get a higher budget than a public-facing API consumer, since admins are fewer and their queries are internal.

## Why not just set timeouts?

Database statement timeouts are a safety net, but they are a blunt instrument. A query that times out after 5 seconds has already consumed 5 seconds of database resources. It may have acquired locks, filled the buffer cache with irrelevant pages, and blocked other queries.

Complexity scoring stops the query before it starts. The database does zero work. The client gets an immediate, actionable error instead of a timeout with no explanation.

The two approaches complement each other. Complexity scoring is the first line of defense. Statement timeouts are the last resort for the cases your scoring model did not anticipate.

That said, the scoring model is imperfect. A query with score 15 might be faster than a query with score 10 if the lower-scoring query hits an unindexed column. The scores are heuristics, not precise measurements. The goal is not to model database performance exactly. The goal is to keep obviously expensive queries from reaching the database at all.
