# When joining a table just to filter it is secretly more work than it needs to be

You want to list all staff members who have a doctor record in the cardiology department. The obvious approach is to JOIN the doctor table and filter it:

```sql
SELECT staff.*
FROM staff
LEFT JOIN doctor ON doctor.staff_id = staff.id
WHERE doctor.department = 'cardiology'
  AND staff.deleted_at IS NULL;
```

This works. But notice something: you join the entire doctor table into the result set and then throw away all the doctor columns. You only needed the doctor table to answer a yes/no question: "does this staff member have a cardiology doctor record?"

Joining a table just to filter on it is like inviting a colleague to a two-hour meeting just to answer one yes-or-no question. You could have sent them a quick message instead.

## JOIN vs EXISTS: what the database actually does

**LEFT JOIN approach:** The database matches every staff row with every qualifying doctor row, potentially creating duplicates if a staff member has multiple doctor records. Then it filters and (if you added DISTINCT) deduplicates.

**EXISTS approach:** For each staff row, the database checks if at least one matching doctor row exists. The moment it finds one, it stops looking. No row multiplication, no deduplication needed.

```sql
-- EXISTS version: ask the yes/no question directly
SELECT staff.*
FROM staff
WHERE staff.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM doctor
    WHERE doctor.staff_id = staff.id
      AND doctor.department = 'cardiology'
  );
```

```
LEFT JOIN approach:                     EXISTS approach:

staff           doctor                  staff           doctor
+----+------+   +----+----------+      +----+------+   +----+----------+
| 1  | Alice|   | 10 | cardio   |      | 1  | Alice|   | 10 | cardio   |
| 2  | Bob  |   | 11 | cardio   |      | 2  | Bob  |   | 11 | cardio   |
|    |      |   | 12 | neuro    |      |    |      |   | 12 | neuro    |
+----+------+   +----+----------+      +----+------+   +----+----------+

Step 1: Join ALL matching rows          Step 1: For Alice, check "any
  Alice + doctor 10                       cardio doctor?" -> YES (found
  Alice + doctor 11                       doctor 10, stop looking)
  Bob   + doctor 12                     Step 2: For Bob, check "any
                                          cardio doctor?" -> NO
Step 2: Filter department=cardio
  Alice + doctor 10    KEEP             Result: Alice
  Alice + doctor 11    KEEP             (no duplicates possible)
  Bob   + doctor 12    DISCARD

Step 3: DISTINCT (needed!)
  Alice (was duplicated)
  Result: Alice
```

The JOIN approach created two rows for Alice (she matched two cardio doctors) and required deduplication. The EXISTS approach found the first match and moved on. For tables with many-to-one relationships, this difference compounds.

## When EXISTS wins

EXISTS has an advantage when:
- You are only filtering, not selecting columns from the joined table
- The joined table has many rows per parent (high fan-out)
- The subquery can use an index on the foreign key

EXISTS does not help much when:
- The joined table is small
- You need columns from the joined table in your SELECT
- The foreign key is already indexed and the join is well-optimized by the planner

## How we detect filter-only joins

The query optimizer inspects which table aliases appear in the SELECT clause versus which ones appear only in filter conditions:

```typescript
function detectFilterOnlyAliases(filterAliases, selectedAliases) {
  const filterOnly = [];

  for (const alias of filterAliases) {
    if (!selectedAliases.has(alias)) {
      // This alias is used in filters but never in SELECT
      filterOnly.push(alias);
    }
  }

  return filterOnly;
}
```

The join planner flags these aliases:

```typescript
interface OptimizedJoinSpec {
  type: 'LEFT';
  parentAlias: string;
  relationProperty: string;
  alias: string;
  depth: number;
  hasDeletedAt: boolean;
  useExists: boolean;  // <-- true for filter-only joins
}
```

```
User request: GET /staff?filter=doctor.department='cardiology'
              (no &include=doctor, so doctor columns are not selected)

Join planner:
  - doctor alias appears in filter conditions: YES
  - doctor alias appears in SELECT/include:    NO
  - Verdict: useExists = true

User request: GET /staff?filter=doctor.department='cardiology'&include=doctor
              (doctor columns ARE selected)

Join planner:
  - doctor alias appears in filter conditions: YES
  - doctor alias appears in SELECT/include:    YES
  - Verdict: useExists = false (need the actual JOIN for SELECT)
```

## The honest caveat

The detection logic is in place, and the `useExists` flag is set correctly on the join spec. In the current version of the query builder, the flag is available for the SQL generation layer to act on. However, not every code path has been updated to convert flagged joins into EXISTS subqueries yet. The LEFT JOIN still runs in those cases, and the flag serves as a marker for future optimization.

This is a common pattern in iterative development: you build the analysis first, prove it works, and then wire up the execution. The analysis itself is valuable because it identifies which queries have optimization potential, and you can measure the gap before investing in the rewrite.

## A comparison of what the database does

| Aspect | LEFT JOIN + WHERE | EXISTS subquery |
|--------|------------------|-----------------|
| Row multiplication | Yes (1 staff x N doctors) | No |
| Needs DISTINCT | Often yes | No |
| Short-circuits | No (joins all matches) | Yes (stops at first match) |
| Can SELECT joined columns | Yes | No |
| Planner optimization | Mature, well-understood | Also well-optimized in modern PG |

For filter-only joins on tables with high fan-out (many child rows per parent), EXISTS can be significantly faster. For small tables or low fan-out, the difference is negligible and the planner may even generate identical execution plans.

The takeaway is straightforward: if you join a table only to check whether a matching row exists, tell the database that is all you need. It can do less work when it knows the answer is yes/no rather than "give me all matching rows."
