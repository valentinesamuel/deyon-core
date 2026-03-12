# We outgrew our findAndPaginate helper. Replacing it took six layers and a lot of second-guessing.

We had a `findAndPaginate` utility that wrapped TypeORM's `.find()` with offset pagination and basic field filtering. It worked for about nine months. Then, within the span of three weeks, we needed relation filtering, cursor-based pagination, full-text search, and a way to stop a client from accidentally bringing down the database with a five-join, three-search query. `findAndPaginate` was not going to stretch that far.

This is the story of how we replaced it, what decisions we made along the way, and which ones we would revisit.

## What broke

The helper looked roughly like this: take a flat filter object, map keys to WHERE conditions, apply OFFSET/LIMIT, return results with a total count. It handled the 80% case fine. The remaining 20% kept showing up as feature requests and production incidents:

- **No relation filtering.** You could filter `status='active'` on the root table. You could not filter `doctor.department='cardiology'` without writing a custom query for each case.
- **No cursor pagination.** OFFSET worked until someone paginated deep into an audit log table. Page 200 took four seconds. (See: the J1 post in this series.)
- **No text search.** "Can we add search?" meant a separate endpoint with hand-written SQL every time.
- **No query budget.** A client sent `include=doctor,department,appointments,lab,pharmacy` on a table with 400K rows. The query ran for 11 seconds and held a connection the entire time.

We could have bolted each feature onto the existing helper. Relation filtering would mean parsing dot-notation fields and adding joins dynamically. Cursor pagination would mean ripping out the offset logic. Search would mean another code path. Budget enforcement would mean... wrapping the whole thing in a try/catch with a timer?

Every extension would make the helper harder to reason about. We decided to replace it with something designed from the start to support all four requirements.

## The six layers

The replacement is a pipeline. Each layer takes input from the previous one and produces a more refined representation of the query.

```
 Request URL query params
          |
  +-------v--------+
  |   1. LEXER     |  Raw filter string --> token stream
  +-------+--------+
          |
  +-------v--------+
  |   2. PARSER    |  Token stream --> AST (tree of conditions)
  +-------+--------+  Also: bracket filter --> AST, then merge
          |
  +-------v--------+
  |   3. VALIDATOR |  AST + config --> validated AST or 400 error
  +-------+--------+  (8 rules: whitelists, limits, complexity)
          |
  +-------v--------+
  |   4. PLANNER   |  AST + sort + include --> JoinSpecs, cursor params
  +-------+--------+  (determines which tables to join, soft-delete flags)
          |
  +-------v--------+
  |   5. OPTIMIZER |  JoinSpecs + AST --> reordered AST, pushdown map
  +-------+--------+  (selectivity reorder, filter-only detection)
          |
  +-------v--------+
  |   6. BUILDER   |  Everything above --> TypeORM QueryBuilder calls
  +----------------+  (the only layer that touches the DB)
```

Each layer has a single responsibility. The lexer does not know about JOINs. The planner does not know about SQL syntax. The builder does not validate. This separation is what lets us test each layer in isolation and change one without breaking the others.

## The decisions, one by one

### AST vs direct query building

The first fork in the road. We could have parsed the filter string and immediately started calling `qb.andWhere()`. Instead, we parse into a tree (AST) first.

The AST lets us do things between parsing and execution: validate field names against a whitelist, count conditions, detect which joins are needed, reorder conditions by selectivity, and push conditions down to JOIN ON clauses. None of that is possible if you go directly from string to SQL.

| Direct building | AST first |
|----------------|-----------|
| Fewer lines of code | More upfront work |
| Hard to validate before execution | Walk the tree, inspect everything |
| Cannot optimize | Reorder, transform, annotate |
| One consumer (the SQL builder) | Multiple consumers (validator, planner, optimizer, builder) |

The AST added maybe 300 lines of code. It saved us from rewriting the validation and optimization logic later.

### Hand-written lexer+parser vs a library

We considered using a parser combinator library or generating a grammar file. But the filter language is small: field names, comparison operators, quoted values, AND, OR, and parentheses. The lexer is about 120 lines. The parser is about 80. Both are pure functions with no dependencies.

A library would have added a dependency, a learning curve for the team, and config files for a grammar that fits on a napkin. Not worth it. If the language grows significantly (nested subqueries, function calls), we would reconsider.

### Cursor vs OFFSET pagination

This was the easiest decision. We had a production incident (the audit log page-200 query). OFFSET pagination has O(n) cost where n is the offset. Cursor pagination has O(1) cost regardless of depth.

The trade-off is that cursor pagination cannot jump to an arbitrary page. Our consumers are all infinite-scroll UIs and API integrations that process pages sequentially. Nobody needed page-jump.

### Redis cache with SHA-256 keys

Two motivations: avoid duplicate DB queries for the same request, and provide a buffer for popular queries during traffic spikes.

We normalize the parsed query (sort all keys), hash it with SHA-256, and use that as the Redis key. Same query in different param order = same cache key. TTL is 60 seconds by default, which is conservative but safe.

The main regret here is invalidation. Right now, any write to a table wipes all cached queries for that table. This is correct but wasteful. A single row update to Staff clears caches for queries that did not include that row. More granular invalidation (based on which rows changed and which queries might be affected) is possible but complex. We have not needed it yet given the short TTL.

### Complexity scoring

We added this after the five-join incident. The scoring model is intentionally simple: count operations, multiply by weights, compare to a budget.

```
filter: 1 point each
join:   3 points each
search: 5 points each
aggregation: 6 points each
```

Is this model perfect? No. A filter on an unindexed column is more expensive than a filter on an indexed column, and our model does not distinguish them. But it catches the obvious cases (5 joins + 3 searches = 30 points, over any reasonable budget) and is easy for the team to understand and tune.

## The decision matrix

| Decision | Options considered | Chose | Why |
|----------|-------------------|-------|-----|
| Intermediate representation | Direct SQL building vs AST | AST | Enables validation, optimization, multiple consumers |
| Parser | Library vs hand-written | Hand-written | Small grammar, no dependency, ~200 lines |
| Pagination | OFFSET vs cursor | Cursor | O(1) at any depth, production incident forced the issue |
| Caching | No cache vs Redis | Redis + SHA-256 keys | Avoid duplicate queries, buffer traffic spikes |
| Query limits | Statement timeout only vs complexity scoring | Both | Scoring stops queries before execution; timeout is the safety net |
| Soft-delete | WHERE only vs JOIN ON | JOIN ON for joined entities | Avoids ghost rows from soft-deleted relations (see M4 post) |

## What we would do differently

**Prepared statement caching.** PostgreSQL re-plans parameterized queries on each execution in some configurations. We could cache the plan by using prepared statements with consistent parameter shapes. This would reduce planning overhead for repeated query patterns.

**Smarter cache invalidation.** Instead of wiping all Staff caches on any Staff write, we could tag cache entries with the filter conditions they depend on and only invalidate entries that might be affected. The complexity is high, but the cache hit rate improvement could be significant for frequently-updated tables.

**EXPLAIN plan integration.** We score complexity heuristically. PostgreSQL already has a cost model (the query planner). We considered running EXPLAIN on the generated query and using the planner's estimated cost as the budget check. We decided against it because EXPLAIN itself takes time and creates a planning overhead on every request. But for an "admin mode" diagnostic, it would be valuable.

**Better error diagnostics.** When a query is rejected, we return the complexity breakdown. We should also return which specific fields or joins contributed the most, so the caller can make targeted adjustments instead of guessing.

## The retrospective

Six layers feels like a lot for something that replaces a 50-line helper. But the helper was a dead end. Every feature request required surgery on a monolithic function. The pipeline adds code, but each piece is testable, replaceable, and understandable in isolation.

The old helper was not wrong for what it was built to do. It was wrong for what we eventually needed. The new engine is probably wrong for something we will need in two years. The difference is that the pipeline structure gives us a place to put the next feature without rewriting the last one.

That is the real payoff. Not elegance. Just room to grow.
