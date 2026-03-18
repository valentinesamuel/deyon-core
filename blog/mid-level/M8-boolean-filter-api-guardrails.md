# How we let users build complex filters without letting them break the database

An API that supports filtering is powerful. An API that supports AND, OR, nested parentheses, relation traversal, and text search is a loaded weapon pointed at your database. Without guardrails, a single creative request can generate a query that locks tables, exhausts connections, and takes down your entire application.

We needed to give users the flexibility to build meaningful filters while keeping a firm ceiling on how much damage any single request can do. The answer was thirteen validation rules, applied in order, before a query ever reaches the database.

## The form-with-guardrails analogy

Think of a form where users can enter anything they want, but with constraints. A text field has a max length. A number field has a min and max. A dropdown limits choices to known values. You are not preventing the user from filling out the form. You are preventing them from submitting something the system cannot safely handle.

Our query validation works the same way. The user can combine filters, sorts, relations, and searches however they want, as long as the combination stays within defined limits.

## The thirteen rules

Every incoming query passes through these checks in order. If any check fails, the request is rejected immediately with a descriptive error. The database sees nothing.

```
Request arrives
    |
    v
+---[1]  Filter fields whitelist ----------+--- FAIL --> 400: "Field 'x' not allowed"
    |
+---[2]  Filter count limit ---------------+--- FAIL --> 400: "Too many filters (12 > max 10)"
    |
+---[3]  Relation depth per field ---------+--- FAIL --> 400: "Field 'a.b.c.d' exceeds max depth 3"
    |
+---[4]  Join count limit -----------------+--- FAIL --> 400: "Too many joins (6 > max 4)"
    |
+---[5]  Sort fields whitelist ------------+--- FAIL --> 400: "Sort field 'x' not allowed"
    |
+---[6]  Include relations whitelist ------+--- FAIL --> 400: "Relation 'x' not allowed"
    |
+---[7]  Search fields whitelist ----------+--- FAIL --> 400: "Search field 'x' not allowed"
    |
+---[8]  Aggregate fields whitelist -------+--- FAIL --> 400: "Aggregate field 'x' not allowed"
    |
+---[9]  groupBy constraints --------------+--- FAIL --> 400: "groupBy field 'x' not allowed"
    |
+---[10] Having constraints ---------------+--- FAIL --> 400: "having clause references unknown field"
    |
+---[11] Cursor + aggregation check -------+--- FAIL --> 400: "Cursor pagination incompatible with aggregation"
    |
+---[12] Complexity score gate ------------+--- FAIL --> 400: "Query too complex (28 > max 20)"
    |
+---[13] Field-path whitelist -------------+--- FAIL --> 400: "Field path 'x.y.z' not allowed"
    |
    v
All passed --> Build and execute query
```

### Rule 1: Filter field whitelist

Every field name in the filter expression is checked against `allowedFilters`. The validator walks the filter tree and collects every field reference:

```typescript
function collectFields(node, fields) {
  if (!node) return;
  if (node.type === 'AND' || node.type === 'OR') {
    for (const child of node.children) collectFields(child, fields);
    return;
  }
  if (node.type === ASTNodeType.CONDITION || node.type === ASTNodeType.AGGREGATE) { fields.add(node.field); }
}
```

If a user references `passwordHash` or `internalNotes`, the request is rejected before parsing goes any further.

### Rule 2: Filter count

Even with whitelisted fields, a user could send 200 filter conditions. Each one adds processing time. `maxFilters` caps this:

```
filter=status='active' AND role='admin' AND dept='eng' AND ...200 more...
                                                          ^
                                              maxFilters: 10 --> REJECTED
```

### Rule 3: Relation depth

Fields can reference nested relations: `doctor.department.hospital.region.name`. Each dot means another JOIN. `maxRelationDepth` limits how deep this nesting can go.

| Field path | Depth | maxRelationDepth=2 |
|------------|-------|--------------------|
| `status` | 0 | Allowed |
| `doctor.department` | 1 | Allowed |
| `doctor.department.name` | 2 | Allowed |
| `doctor.department.hospital.region` | 3 | Rejected |

### Rule 4: Join count

Even shallow relations add up. If a user filters on five different relations, that is five JOINs. `maxJoins` caps the total number of unique relation prefixes:

```
filter=doctor.name='Smith' AND nurse.shift='night' AND admin.level='3'
       AND lab.type='blood' AND pharmacy.status='open'

Unique relation prefixes: {doctor, nurse, admin, lab, pharmacy} = 5
maxJoins: 4 --> REJECTED
```

### Rule 5: Sort field whitelist

Sorting on an unindexed column can force a full table sort. `allowedSort` restricts which columns the user can sort by, ensuring every sortable field has an appropriate index.

### Rule 6: Include relations whitelist

The `include` parameter controls which relations are eagerly loaded (SELECT-ed). `allowedRelations` prevents users from loading deeply nested or expensive relation trees.

### Rule 7: Search field whitelist

Text search is the most expensive operation in the query engine. `allowedSearch` restricts which fields support it, ensuring only properly indexed fields are searchable.

### Rule 8: Aggregate fields whitelist

Aggregate operations (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) are only permitted on pre-approved fields. This prevents aggregations over sensitive or unindexed columns.

### Rule 9: GroupBy constraints

`groupBy` clauses must reference fields in the `allowedGroupBy` list. Unrestricted grouping can generate enormous intermediate result sets.

### Rule 10: Having constraints

`having` clauses are checked for field references and operator safety. A `having` clause that references a non-aggregated column or uses a disallowed operator is rejected.

### Rule 11: Cursor + aggregation incompatibility

Cursor-based pagination and aggregation queries are mutually exclusive. Aggregated results do not have stable per-row sort keys, so cursor encoding is undefined. Requests that combine both are rejected with a clear message rather than returning unpredictable results.

### Rule 12: Complexity score gate

This check aggregates the overall query cost. Even if each individual rule passes, the combination might be too much. The complexity scorer assigns weights to each operation type:

| Operation | Weight |
|-----------|--------|
| Filter condition | 1 |
| Join | 3 |
| Search term | 5 |
| Aggregation | 6 |

A query with 4 filters (4), 3 joins (9), and 1 search (5) scores 18. If `maxComplexityScore` is 20, it passes. Add one more join and the score hits 21, and it is rejected.

### Rule 13: Field-path whitelist

The final structural check validates that every dotted field path in filters, sorts, and aggregations resolves to an explicitly allowed path. This catches paths that look valid (fields and relations both exist) but form combinations that were not intentionally exposed.

## Layered defense

The thirteen rules form layers. Each layer catches a different category of problem:

```
+-------------------------------------------------------+
|  Layer 1: IDENTITY     (Rules 1, 5, 6, 7, 8)          |
|  "Can you even use these fields?"                     |
|  Whitelists for filter, sort, include, search,        |
|  and aggregate fields                                 |
+-------------------------------------------------------+
|  Layer 2: QUANTITY     (Rules 2, 3, 4)                 |
|  "Are you asking for too much?"                       |
|  Caps on filter count, depth, join count              |
+-------------------------------------------------------+
|  Layer 3: AGGREGATION  (Rules 9, 10)                   |
|  "Are your aggregation constraints valid?"            |
|  groupBy and having field/operator constraints        |
+-------------------------------------------------------+
|  Layer 4: COMPATIBILITY (Rule 11)                      |
|  "Are your feature combinations allowed?"             |
|  Cursor + aggregation incompatibility check           |
+-------------------------------------------------------+
|  Layer 5: COST         (Rules 12, 13)                  |
|  "Is the overall cost acceptable?"                    |
|  Complexity score gate + field-path whitelist         |
+-------------------------------------------------------+
```

Layer 1 catches unauthorized access. Layer 2 catches abuse of authorized features. Layers 3 and 4 catch invalid aggregation shapes and feature conflicts. Layer 5 catches combinations that individually look fine but together are too expensive or structurally invalid.

## The error responses

Both error types share a consistent structure:

```json
// Rule 1-7 failures:
{
  "code": "QUERY_VALIDATION_ERROR",
  "message": "Filter field 'passwordHash' is not allowed",
  "details": {
    "field": "passwordHash",
    "allowed": ["status", "role", "email", "createdAt"]
  }
}

// Rule 8 failure:
{
  "code": "QUERY_TOO_COMPLEX",
  "message": "Query complexity score 28 exceeds maximum allowed 20",
  "details": {
    "score": 28,
    "max": 20,
    "breakdown": {
      "filters": 4,
      "joins": 9,
      "search": 15,
      "aggregations": 0
    }
  }
}
```

The details object gives the caller enough information to fix their request. They can see which field was rejected, what is allowed, or which part of their query pushed the complexity over budget.

## Configuration per entity

Different entities have different risk profiles. A small lookup table can tolerate more joins than a table with millions of rows:

```typescript
const staffQueryConfig = {
  allowedFilters: ['status', 'role', 'email', 'createdAt'],
  allowedSort: ['createdAt', 'email'],
  allowedRelations: ['doctor', 'doctor.department'],
  allowedSearch: [{ field: 'name', type: 'tri' }, { field: 'bio', type: 'fts' }],
  maxFilters: 10,
  maxJoins: 4,
  maxRelationDepth: 2,
  maxComplexityScore: 20,
};
```

Each entity gets its own config object. The validation layer reads it and enforces the rules accordingly. Adding a new entity to the query engine means defining its config, and all thirteen guardrails apply automatically.

The goal is not to prevent users from querying. The goal is to make sure every query that reaches the database is one your database can handle without breaking a sweat.
