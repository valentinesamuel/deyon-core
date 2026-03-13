# Fix: Filter not being applied on staff fetch

## Context

The user is calling `GET /staff?limit=10&include=role,department&filter[isActive][eq]=false&filter[roleId][eq]=<uuid>` but all staff records are returned — filters are not applied.

Root cause: `coerceValue()` in `bracketParser.ts` does not handle the boolean strings `'true'` / `'false'`. The value `'false'` passes through as a plain string. When TypeORM sends this string parameter to PostgreSQL for comparison against a `boolean` column, PostgreSQL cannot resolve the `= (boolean, text)` operator and either throws or silently ignores the condition. The `QueryValue` type also lacks `boolean`, compounding the issue.

Secondary concern: `filterBuilder.buildConditionSql()` silently returns `null` when the `filterPlan.resolvedConditions` map lookup misses a node — no error, no WHERE clause added for that condition.

---

## Files to modify

| File | Change |
|------|--------|
| `src/shared/queryEngine/types/ast.types.ts` | Add `boolean` to `QueryValue` |
| `src/shared/queryEngine/parser/bracketParser.ts` | Coerce `'true'`/`'false'` to boolean in `coerceValue()` |
| `src/shared/queryEngine/parser/bracketParser.spec.ts` | Add tests for boolean coercion |

---

## Implementation Plan

### Step 1 — Update `QueryValue` type
**File:** `src/shared/queryEngine/types/ast.types.ts` (line 16)

```ts
// Before
export type QueryValue = string | number | string[] | number[] | null;

// After
export type QueryValue = string | number | boolean | string[] | number[] | null;
```

### Step 2 — Fix `coerceValue` in `bracketParser.ts`
**File:** `src/shared/queryEngine/parser/bracketParser.ts` (lines 33–48)

Add boolean coercion BEFORE the numeric check:

```ts
function coerceValue(raw: string, op: Operator): QueryValue {
  if (op === 'isNull' || op === 'notNull') return null;

  if (op === 'in' || op === 'nin') {
    return raw.split(',').map((v) => v.trim());
  }

  if (op === 'between') {
    return raw.split(',').map((v) => v.trim());
  }

  if (raw === 'null') return null;

  // NEW: coerce boolean strings before numeric check
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  const num = Number(raw);
  if (!isNaN(num) && raw.trim() !== '') return num;
  return raw;
}
```

This ensures `filter[isActive][eq]=false` produces `ConditionNode.value = false` (boolean), which TypeORM sends as PostgreSQL `bool` type (OID 16) — correctly comparable to a `boolean` column.

### Step 3 — Add tests to `bracketParser.spec.ts`

Add these test cases to the `BracketParser` describe block:

```ts
it('coerces "false" string to boolean false', () => {
  const ast = parseBracketFilter({ isActive: { eq: 'false' } }) as ConditionNode;
  expect(ast).toMatchObject({ type: 'CONDITION', field: 'isActive', op: 'eq', value: false });
  expect(typeof ast.value).toBe('boolean');
});

it('coerces "true" string to boolean true', () => {
  const ast = parseBracketFilter({ isApproved: { eq: 'true' } }) as ConditionNode;
  expect(ast).toMatchObject({ type: 'CONDITION', field: 'isApproved', op: 'eq', value: true });
  expect(typeof ast.value).toBe('boolean');
});

it('does not coerce UUID strings', () => {
  const uuid = '6d531e9b-9462-4525-870d-064059300896';
  const ast = parseBracketFilter({ roleId: { eq: uuid } }) as ConditionNode;
  expect(ast).toMatchObject({ value: uuid });
  expect(typeof ast.value).toBe('string');
});
```

---

## Verification

1. Run unit tests: `pnpm test:unit`
   - All existing tests should still pass
   - New boolean coercion tests should pass

2. Manually test the endpoint:
   ```
   GET /staff?limit=10&include=role,department&filter[isActive][eq]=false&filter[roleId][eq]=<uuid>
   ```
   Should return only staff records where `isActive = false` AND `roleId = <uuid>`.

3. Test the inverse: `filter[isActive][eq]=true` should return only active staff.
