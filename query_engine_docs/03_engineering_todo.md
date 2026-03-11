# Engineering TODO List

## Phase 1 — Query Language Core
- Query parser
- Query grammar
- AST representation
- Basic filtering
- Basic joins
- Sorting
- Pagination
- Field selection

## Phase 2 — Security & Validation
- Model whitelists
- Max filters enforcement
- Max joins enforcement
- Max depth validation
- Cycle detection

## Phase 3 — Query Planner
- Join planner
- Filter planner
- Search planner
- Select planner

## Phase 4 — Pagination Engine
- Cursor encoding
- Cursor decoding
- Composite sort cursor support

## Phase 5 — Search Engine
- FTS search implementation
- Trigram search implementation
- Per-column search configuration

## Phase 6 — Aggregations
- GROUP BY support
- Aggregation filters
- HAVING clauses

## Phase 7 — Query Optimization
- Join optimization
- EXISTS optimization
- Query cost scoring

## Phase 8 — Observability
- Query analytics
- Slow query logging
- Query metrics

## Phase 9 — Caching
- Redis query caching
- Cache invalidation hooks