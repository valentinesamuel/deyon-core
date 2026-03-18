# Blog Post Accuracy Audit & Fix Plan

## Context

The query engine has evolved and the blog posts were written at some point during that evolution. Before linking the repo from the blog, every code snippet, interface definition, function signature, and number in every post needs to match the actual implementation exactly. Readers who look at the live code should find zero surprises.

This plan covers **all 13 posts** with the specific surgical edits required per post.

---

## Posts with NO changes needed

These are accurate and/or correctly simplified:
- **J2** – `collectFields`, config shape, error JSON all match.
- **J3** – TypeORM query-builder intro; no engine-specific snippets.
- **M3** – `stableStringify`, `buildCacheKey`, `invalidate` all match exactly (prefix `qe:cache`, DEFAULT_TTL=60, `this.redis.del(...keys)`).
- **M5** – FTS/trigram config shape, SQL, per-field type config all match.
- **M6** – `getEffectiveSortFields`, `buildCursorWhereClause` logic and SQL patterns all match.
- **S1** – 6-layer pipeline, design decision table, cost model all match.

---

## Posts requiring edits

### 1. `J1-cursor-pagination-why-offset-breaks.md`

**Issue A – `buildCursorPage` signature is incomplete**
- Blog shows 3 params: `buildCursorPage(rows, limit, sortFields)`
- Actual has 5: `buildCursorPage<T>(rows: T[], limit: number, sortFields: SortField[], prevCursor: string | null = null, totalRecords?: number): CursorPage<T>`

Fix: Add the two optional params to the signature in the code snippet.

**Issue B – `meta` shape is missing `prevCursor`**
- Blog meta: `{ nextCursor, hasMore, limit }`
- Actual `CursorMeta`: `{ nextCursor, prevCursor, hasMore, limit, totalRecords? }`
- The JSON response example in the post also omits `prevCursor`.

Fix: Update the return statement in the snippet and the JSON example to include `prevCursor: null`.

---

### 2. `M1-filter-dsl-lexer-parser-ast.md`

**Issue – `ConditionNode` shows `operator:` but actual field is `op:`**

The code example at the bottom of the post:
```typescript
{ type: 'CONDITION', field: 'status', operator: 'eq', value: 'active' }
```
must be:
```typescript
{ type: 'CONDITION', field: 'status', op: 'eq', value: 'active' }
```
This appears twice: once in the standalone condition node and once inside the logical node's children array.

Note: `type: 'CONDITION'` is correct because `ASTNodeType` is a string enum (`ASTNodeType.CONDITION = 'CONDITION'`).

---

### 3. `M2-complexity-scoring-budget.md`

**Issue A – `scoreComplexity` body uses wrong `ParsedQuery` field names**

Blog shows:
```typescript
const filters = countLeafConditions(query.ast);
const joins = countUniqueRelationPrefixes(query.joins);
const search = query.searchTerms?.length ?? 0;
const aggregations = query.groupBy?.length ? 1 : 0;
```

Actual `ParsedQuery` fields:
- `query.ast` → `query.whereAst` (and also includes `query.havingAst`)
- `query.joins` doesn't exist on `ParsedQuery`; join count is derived by walking the AST for relation prefixes + scanning `query.include` + `query.groupBy`
- `query.searchTerms` → `query.search` (a `SearchInput[]`)
- `query.groupBy?.length` is correct but aggregations also checks `query.aggregates.length`

Fix: Replace the function body to match the actual implementation:
```typescript
export function scoreComplexity(query: ParsedQuery): ComplexityBreakdown {
  const filterCount =
    countLeafConditions(query.whereAst) + countLeafConditions(query.havingAst);

  // Count unique relation prefixes from filters, include=, and groupBy
  const relationPrefixes = collectAllRelationPrefixes(query);
  const joinCount = relationPrefixes.size;

  const searchCount = query.search.length;
  const aggregationCount = query.aggregates.length + query.groupBy.length > 0 ? 1 : 0;

  const filters = filterCount * COSTS.filter;
  const joins = joinCount * COSTS.join;
  const search = searchCount * COSTS.search;
  const aggregations = aggregationCount * COSTS.aggregation;
  const total = filters + joins + search + aggregations;

  return { filters, joins, search, aggregations, total };
}
```

**Issue B – `ComplexityBreakdown` values are already-multiplied costs, not raw counts**

The `breakdown` fields in the return value (and in error responses) are **costs already multiplied**, meaning:
- `filters` = filterCount × 1  (equals filter count since cost = 1)
- `joins` = joinCount × 3  (always a multiple of 3)
- `search` = searchCount × 5  (always a multiple of 5)
- `aggregations` = 0 or 6

The M2 error response example:
```json
{ "score": 28, "breakdown": { "filters": 4, "joins": 5, "search": 2, "aggregations": 0 } }
```
Is doubly wrong:
- `joins: 5` is impossible (must be a multiple of 3)
- Sum: 4+5+2+0 = 11, not 28

Fix: Replace with a mathematically valid example:
```json
{
  "score": 28,
  "breakdown": { "filters": 4, "joins": 9, "search": 15, "aggregations": 0 }
}
```
(4 filter conditions × 1 = 4; 3 joins × 3 = 9; 3 search terms × 5 = 15; total = 28 ✓)

**Issue C – "last of eight validation checks" → twelfth of thirteen**

The gate section says: "The complexity score is the last of eight validation checks..."
Actual: it is rule 12 out of 13 (rule 13 is field-path whitelisting).

Fix: Change to "one of thirteen validation checks" or describe the gate accurately — the 5 additional rules cover aggregate fields, groupBy constraints, having constraints, cursor+aggregation incompatibility, and field-path whitelisting.

The numbered gate diagram showing rules [1]-[8] should be expanded to [1]-[13]:
```
[1]  Filter fields whitelist
[2]  Filter count limit
[3]  Relation depth per field
[4]  Join count limit
[5]  Sort fields whitelist
[6]  Include relations whitelist
[7]  Search fields whitelist
[8]  Aggregate fields whitelist
[9]  groupBy requires at least one aggregate
[10] having requires groupBy
[11] Cursor not supported with aggregation
[12] Complexity score gate         <-- the gate
[13] Explicit fields whitelist
```

---

### 4. `M4-soft-delete-join-bug.md`

**Issue – `JoinSpec` interface is missing the `isInclude` field**

Blog shows:
```typescript
export interface JoinSpec {
  type: 'LEFT';
  parentAlias: string;
  relationProperty: string;
  alias: string;
  depth: number;
  hasDeletedAt: boolean;
}
```

Actual has one additional field:
```typescript
  isInclude: boolean; // whether this join was registered via include= (needs SELECT)
```

Fix: Add `isInclude: boolean;` to the interface in the blog post, with a brief inline comment matching the actual code.

---

### 5. `M7-filter-only-join-exists-subquery.md`

**Issue A – `detectFilterOnlyAliases` has a wrong/simplified signature**

Blog shows:
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

Actual signature:
```typescript
export function detectFilterOnlyAliases(
  joinSpecs: JoinSpec[],
  filterPlan: FilterPlan,
  selectedAliases: Set<string>,
): Set<string>
```

The actual function derives `filterAliases` internally by iterating over `filterPlan.resolvedConditions`, then cross-checks those against the `joinSpecs` array. It returns a `Set<string>`, not an array.

Fix: Update the snippet to show the actual signature with a note on what `FilterPlan` provides. The internal logic can remain conceptually simplified but the call signature must be right.

**Issue B – `OptimizedJoinSpec` is missing `pushdownConditions` and `isInclude` fields**

Blog shows the interface with only `useExists` added. Actual adds two fields to the base `JoinSpec`:
```typescript
export interface OptimizedJoinSpec extends JoinSpec {
  useExists: boolean;
  pushdownConditions: string[];  // raw SQL snippets for JOIN ON predicate pushdown
}
```

Also `JoinSpec` itself has `isInclude: boolean` (already fixed in M4). The combined actual interface should show all fields.

Fix: Add `pushdownConditions: string[];` to the `OptimizedJoinSpec` shown in M7.

---

### 6. `M8-boolean-filter-api-guardrails.md`

**Issue A – "eight validation rules" / "eight guardrails" throughout → 13**

The intro says: "the answer was eight validation rules". The diagram, the section headers, the "layered defense" section all reference 8. Actual code has 13 rules.

Fix: Change every mention of "eight" to "thirteen" where it refers to validation rule count. Update the diagram and the "layered defense" graphic to include all 13 rules (the 5 additions are aggregation-related: rules 8-11 + rule 13).

New diagram to replace the 8-rule version:
```
[1]  Filter fields whitelist         --> 400: "Field 'x' not allowed"
[2]  Filter count limit              --> 400: "Too many filters"
[3]  Relation depth per field        --> 400: "Field 'x' exceeds max depth"
[4]  Join count limit                --> 400: "Too many joins"
[5]  Sort fields whitelist           --> 400: "Sort field 'x' not allowed"
[6]  Include relations whitelist     --> 400: "Relation 'x' not allowed"
[7]  Search fields whitelist         --> 400: "Search field 'x' not allowed"
[8]  Aggregate fields whitelist      --> 400: "Aggregate field 'x' not allowed"
[9]  groupBy requires aggregates     --> 400: "groupBy requires an aggregate"
[10] having requires groupBy         --> 400: "having requires groupBy"
[11] Cursor + aggregation blocked    --> 400: "cursor not supported with groupBy"
[12] Complexity score gate           --> 400: "Query too complex"
[13] Explicit fields whitelist       --> 400: "Field 'x' not allowed"
```

Layer diagram updates:
```
Layer 1: IDENTITY  (Rules 1, 5, 6, 7)   -- whitelists
Layer 2: QUANTITY  (Rules 2, 3, 4)       -- caps
Layer 3: AGGREGATE LOGIC (Rules 8–11)   -- aggregation guard rails
Layer 4: COST GATE (Rule 12)            -- complexity score
Layer 5: FIELD SCOPE (Rule 13)          -- explicit field whitelist
```

**Issue B – `collectFields` doesn't handle `AGGREGATE` nodes**

Blog shows:
```typescript
if (node.type === 'CONDITION') fields.add(node.field);
```

Actual:
```typescript
if (node.type === ASTNodeType.CONDITION || node.type === ASTNodeType.AGGREGATE) {
  fields.add(node.field);
}
```

Fix: Add the AGGREGATE check to the snippet.

---

### 7. `S2-query-optimizer-deep-dive.md`

**Issue A – `detectFilterOnlyAliases` has the same wrong/simplified signature as in M7**

Same fix as M7 Issue A. The S2 snippet should show the actual signature.

**Issue B – `buildPushdownMap` has completely wrong signature and logic**

Blog shows:
```typescript
function buildPushdownMap(ast, joinSpecs) {
  const pushdown = new Map(); // alias -> conditions[]
  for (const condition of leafConditions(ast)) {
    const alias = extractAlias(condition.field);
    ...
  }
}
```

Actual:
```typescript
function buildPushdownMap(filterPlan: FilterPlan, ast: ASTNode | null): Map<string, string[]>
```

Key differences from blog:
1. Parameters are `(filterPlan, ast)` — not `(ast, joinSpecs)`. First arg is `FilterPlan`, not `ast`.
2. Uses `filterPlan.resolvedConditions` (which maps each condition node to its `{alias, column}`) — not a raw `extractAlias(condition.field)` heuristic.
3. Only processes **top-level** conditions (direct children of the root AND node), not all leaf conditions. This is intentional: only safe single-alias top-level conditions can be pushed down without changing semantics.
4. Returns `Map<string, string[]>` where values are formatted SQL snippet strings (not raw condition nodes).

Fix: Rewrite the snippet to match the actual parameters and explain the top-level-only constraint:

```typescript
function buildPushdownMap(
  filterPlan: FilterPlan,
  ast: ASTNode | null,
): Map<string, string[]> {
  const pushdown = new Map<string, string[]>();
  if (!ast) return pushdown;

  // Only top-level conditions (direct children of a root AND) are safe to push down.
  // Nested conditions inside OR branches cannot be moved without changing semantics.
  const candidates: ConditionNode[] = [];
  if (ast.type === ASTNodeType.AND) {
    for (const child of ast.children) {
      if (child.type === ASTNodeType.CONDITION) candidates.push(child);
    }
  } else if (ast.type === ASTNodeType.CONDITION) {
    candidates.push(ast);
  }

  for (const cond of candidates) {
    const resolved = filterPlan.resolvedConditions.get(cond);
    if (!resolved || resolved.alias === 'root') continue;

    // This condition targets a single non-root alias — it can live on the JOIN ON
    const snippet = formatConditionSnippet(resolved.alias, resolved.column, cond);
    if (!pushdown.has(resolved.alias)) pushdown.set(resolved.alias, []);
    pushdown.get(resolved.alias)!.push(snippet);
  }

  return pushdown;
}
```

---

## Files to modify (in order of dependency)

1. `blog/junior/J1-cursor-pagination-why-offset-breaks.md`
2. `blog/mid-level/M1-filter-dsl-lexer-parser-ast.md`
3. `blog/mid-level/M2-complexity-scoring-budget.md`
4. `blog/mid-level/M4-soft-delete-join-bug.md`
5. `blog/mid-level/M7-filter-only-join-exists-subquery.md`
6. `blog/mid-level/M8-boolean-filter-api-guardrails.md`
7. `blog/senior/S2-query-optimizer-deep-dive.md`

---

## Verification

After making all edits:
1. Re-read each changed snippet against the actual source file side-by-side.
2. For math in error responses: sum the breakdown fields and confirm they equal `score`.
3. For interface definitions: confirm every field matches the actual TypeScript interface.
4. For function signatures: confirm param names/types match the actual exported function.
5. Check that no "eight" → "thirteen" replacement was missed with a grep across M2 and M8.
