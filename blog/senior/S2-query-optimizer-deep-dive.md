# The three query tricks we built into our optimizer -- and two we wish we'd added from day one

Query optimization is one of those things that feels clever until you realize how much you left on the table. We shipped an optimizer with three techniques. Two of them clearly paid off. One is half-built. And there are at least two things we should have done from the start that we are now retrofitting.

This is what we built, why, and what we are honest about.

## Optimization 1: Reorder conditions by how selective they are

PostgreSQL's query planner is smart, but it is not omniscient. For AND conditions in a WHERE clause, the evaluation order can matter. If the first condition eliminates 95% of rows, the second condition only needs to evaluate the remaining 5%. If you put the least selective condition first, the database does more work per row before it can discard them.

We reorder AND-node children in the AST by a selectivity score before the query hits the database:

```typescript
const SELECTIVITY_SCORES = {
  eq: 1,       // exact match -- most selective
  ne: 2,
  isNull: 3,
  notNull: 4,
  in: 5,
  nin: 6,
  gt: 7,
  gte: 7,
  lt: 7,
  lte: 7,
  between: 8,
  like: 9,
  ilike: 10,   // case-insensitive pattern -- least selective
};
```

The `reorderBySelectivity` function is a pure function: it takes an AST, returns a new AST with AND children sorted by score (lowest first). It does not mutate the input.

```
Before reorder:                      After reorder:
AND                                  AND
 ├── ilike (score 10)                 ├── eq (score 1)      <-- most selective first
 ├── between (score 8)                ├── in (score 5)
 ├── in (score 5)                     ├── between (score 8)
 └── eq (score 1)                     └── ilike (score 10)  <-- least selective last
```

**The honest caveat:** This is a hint, not a guarantee. PostgreSQL's planner may reorder conditions internally based on statistics it has about the actual data distribution. Our reordering helps in cases where the planner lacks good statistics (no ANALYZE, freshly loaded data, complex expressions) or where the evaluation order of the WHERE clause matters due to function call costs. In well-analyzed tables, the planner often arrives at the same plan regardless.

We measured a 10-15% improvement on queries with mixed selectivity conditions on tables that had not been recently analyzed. On well-maintained tables, the difference was negligible. We kept it because it is cheap (a sort operation on a small array) and never makes things worse.

## Optimization 2: Detect joins that exist only for filtering

When a user filters on `doctor.department = 'cardiology'` but does not include `doctor` in the response, we are joining an entire table just to ask a yes/no question. The optimizer detects this:

```typescript
function detectFilterOnlyAliases(filterAliases, selectedAliases) {
  const filterOnly = [];
  for (const alias of filterAliases) {
    if (!selectedAliases.has(alias)) {
      filterOnly.push(alias);
    }
  }
  return filterOnly;
}
```

The detection walks two sets: aliases that appear in filter conditions, and aliases that appear in the SELECT clause (from `include` relations). If an alias is in the first set but not the second, it is a filter-only join.

```
Query: filter=doctor.department='cardiology'  (no &include=doctor)

filterAliases:    { root_doctor }
selectedAliases:  { }  (only root is selected)

root_doctor is in filterAliases but NOT in selectedAliases
  --> mark as filter-only, set useExists: true on the JoinSpec
```

**The honest caveat:** The `useExists` flag is set on the `OptimizedJoinSpec`, and the detection is tested and working. However, the query builder does not yet rewrite all flagged joins into EXISTS subqueries. In the current version, flagged joins still execute as LEFT JOINs. The flag is infrastructure for the next iteration: once we wire up the EXISTS rewrite in the builder, the detection is already done and tested.

This is a deliberate sequencing choice. We wanted to validate that the detection was correct (are we identifying the right joins?) before changing the SQL output. Shipping broken SQL is worse than shipping unoptimized SQL.

| Status | Component | Done? |
|--------|-----------|-------|
| Detection of filter-only aliases | `detectFilterOnlyAliases()` | Yes |
| `useExists` flag on JoinSpec | `OptimizedJoinSpec` interface | Yes |
| EXISTS subquery generation in builder | `queryBuilder.ts` | Partial |

## Optimization 3: Push conditions down to JOIN ON

When a filter condition references only one non-root alias, it can be moved from the WHERE clause to the JOIN ON clause. This is called predicate pushdown, and it reduces the number of rows that participate in the join.

```typescript
function buildPushdownMap(ast, joinSpecs) {
  const pushdown = new Map(); // alias -> conditions[]

  for (const condition of leafConditions(ast)) {
    const alias = extractAlias(condition.field);
    if (alias && alias !== 'root') {
      // This condition only references one non-root alias
      // It can be pushed down to that alias's JOIN ON clause
      if (!pushdown.has(alias)) pushdown.set(alias, []);
      pushdown.get(alias).push(condition);
    }
  }
  return pushdown;
}
```

The difference in SQL:

```sql
-- Before pushdown: filter in WHERE
SELECT staff.*
FROM staff
LEFT JOIN doctor ON doctor.staff_id = staff.id
WHERE staff.deleted_at IS NULL
  AND doctor.department = 'cardiology';

-- After pushdown: filter on JOIN ON
SELECT staff.*
FROM staff
LEFT JOIN doctor
  ON doctor.staff_id = staff.id
  AND doctor.department = 'cardiology'
WHERE staff.deleted_at IS NULL;
```

```
Before pushdown:                     After pushdown:

staff (all rows)                     staff (all rows)
    |                                    |
    LEFT JOIN doctor (all rows)          LEFT JOIN doctor
    |                                        (only cardiology rows join)
    WHERE filters BOTH tables            |
    |                                    WHERE filters only staff
    v                                    v
    Result                               Result
```

Why this matters: in the "before" version, the LEFT JOIN produces a row for every staff-doctor combination, and then the WHERE clause filters down to cardiology. In the "after" version, only cardiology doctors participate in the join in the first place. The intermediate result set is smaller.

**Important interaction with LEFT JOIN semantics:** Moving a condition from WHERE to JOIN ON changes behavior for rows with no match. With the condition in WHERE, a staff member with no cardiology doctor is excluded from results entirely (because `doctor.department` is NULL, and `NULL = 'cardiology'` is false). With the condition in JOIN ON, that staff member appears with NULL doctor columns (the LEFT JOIN preserves the row).

This means pushdown is only correct when you want to preserve LEFT JOIN semantics, which is usually the case when the condition is meant to filter the joined data rather than filter the root entity. Our pushdown logic only applies when the condition clearly targets a single non-root alias and the query intent is to narrow the join, not restrict root rows.

## What we wish we had added from day one

### Prepared statement caching

Every query we build goes through PostgreSQL's planner. For parameterized queries with the same structure but different parameter values (`WHERE status = $1` with `$1 = 'active'` vs `$1 = 'inactive'`), the planner produces the same plan. In some PostgreSQL configurations, this re-planning happens on every execution.

Named prepared statements let PostgreSQL cache and reuse the plan. We did not add it because TypeORM's query builder does not make it straightforward. The planning overhead is measurable (1-3ms per query on our largest tables) and adds up under load.

### Automatic cache invalidation tied to entity writes

Right now, cache invalidation is a blunt instrument: any write to the Staff table wipes every cached Staff query. This is correct but wasteful.

```
Current approach:
  UPDATE staff SET status = 'inactive' WHERE id = 42;
  --> invalidate('Staff')
  --> SCAN and DEL every qe:cache:Staff:* key
  --> All Staff query caches gone, even those that never included id=42

What we want:
  UPDATE staff SET status = 'inactive' WHERE id = 42;
  --> Identify which cached queries COULD include id=42
  --> Only invalidate those specific cache keys
  --> Leave unaffected caches intact
```

The implementation would require tagging cache entries with filter conditions and checking whether a write affects the result set. We have not built it because the 60-second TTL makes most of the problem go away. But on high-write tables, the cache hit rate suffers noticeably.

## The takeaway

Optimizers are iterative. We shipped three techniques:

| Optimization | Impact | Status |
|-------------|--------|--------|
| Selectivity reordering | Small but consistent (10-15% on unanalyzed tables) | Complete |
| Filter-only join detection | Infrastructure ready, SQL rewrite partial | Detection done, builder WIP |
| Predicate pushdown | Measurable on high-fanout joins | Complete |

Two things we should have done from the start (prepared statement caching, granular invalidation) are now on the roadmap.

The instinct with optimization is to build everything before shipping. In practice, you ship the basics, measure where the actual bottlenecks are, and add optimizations where they matter most. Half of what you think will be slow is not. The other half is slow in ways you did not predict. The optimizer's job is to be a framework for iterating on performance, not a finished product.
