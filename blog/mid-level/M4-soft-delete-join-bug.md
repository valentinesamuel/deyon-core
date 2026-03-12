# The deleted-data bug that appears when you start joining tables

Soft delete is one of those patterns that feels simple until it interacts with joins. You add a `deletedAt` column, set it to a timestamp when something is "deleted," and filter it out with `WHERE deletedAt IS NULL`. Done, right?

Not quite. That WHERE clause only protects the root table. The moment you LEFT JOIN another table that also uses soft deletes, the deleted rows from that table show up in your results like uninvited guests.

## The setup

We have two entities. `Staff` has a `deletedAt` column. `Doctor` also has a `deletedAt` column. A staff member can be linked to a doctor record.

```
staff table                          doctor table
+----+--------+------------+         +----+----------+------------+
| id | name   | deleted_at |         | id | staff_id | deleted_at |
+----+--------+------------+         +----+----------+------------+
| 1  | Alice  | NULL       |         | 10 | 1        | NULL       |
| 2  | Bob    | NULL       |         | 11 | 2        | 2024-06-01 |  <-- soft-deleted
| 3  | Carol  | 2024-05-15 |         | 12 | 3        | NULL       |
+----+--------+------------+         +----+----------+------------+
```

Carol (staff id 3) is soft-deleted. Doctor 11 (linked to Bob) is also soft-deleted. We want to list active staff with their doctor information.

## The naive query

```sql
SELECT staff.*, doctor.*
FROM staff
LEFT JOIN doctor ON doctor.staff_id = staff.id
WHERE staff.deleted_at IS NULL
```

Results:

| staff.id | staff.name | doctor.id | doctor.deleted_at |
|----------|------------|-----------|-------------------|
| 1 | Alice | 10 | NULL |
| 2 | Bob | 11 | **2024-06-01** |

Carol is correctly excluded (the WHERE clause filtered her out). But Bob's doctor record, which was soft-deleted on June 1st, still shows up. The WHERE clause only checks `staff.deleted_at`. Nobody checked `doctor.deleted_at`.

## Why this is a problem

At best, you display deleted data to the user. At worst, the application logic treats that doctor record as active and makes decisions based on it: assigning appointments, sending emails, calculating availability. The data is "deleted" in the sense that someone pressed the delete button, but it is alive and well in your query results.

## The wrong fix

The first instinct is to add another WHERE clause:

```sql
SELECT staff.*, doctor.*
FROM staff
LEFT JOIN doctor ON doctor.staff_id = staff.id
WHERE staff.deleted_at IS NULL
  AND doctor.deleted_at IS NULL     -- <-- this breaks things
```

This seems like it would work, but it quietly changes the behavior of the LEFT JOIN. A LEFT JOIN is supposed to return the staff row even if there is no matching doctor row (with NULLs for the doctor columns). But `doctor.deleted_at IS NULL` in the WHERE clause filters out rows where `doctor.deleted_at` is NULL because there is no doctor at all (the LEFT JOIN produced NULLs). In those cases, `NULL IS NULL` is actually true, so that specific scenario is fine. However, the real issue is that for a soft-deleted doctor, the WHERE clause removes the entire staff row from results.

Consider a staff member whose only doctor record is soft-deleted. With this WHERE clause, they disappear from results entirely, as if the staff member themselves was deleted. That is not what we want. We want the staff member to appear, just without the deleted doctor attached.

## The correct fix: filter on the JOIN condition

```sql
SELECT staff.*, doctor.*
FROM staff
LEFT JOIN doctor
  ON doctor.staff_id = staff.id
  AND doctor.deleted_at IS NULL     -- <-- check happens during the JOIN
WHERE staff.deleted_at IS NULL
```

Results:

| staff.id | staff.name | doctor.id | doctor.deleted_at |
|----------|------------|-----------|-------------------|
| 1 | Alice | 10 | NULL |
| 2 | Bob | NULL | NULL |

Bob still appears (he is an active staff member), but his soft-deleted doctor record is excluded by the JOIN condition. The LEFT JOIN sees "no matching non-deleted doctor for Bob" and returns NULLs for the doctor columns. This is the correct behavior.

```
WHERE clause filter:                 JOIN ON filter:

staff LEFT JOIN doctor               staff LEFT JOIN doctor
         |                                    |
    All matching                     Only non-deleted
    doctor rows join                 doctor rows join
         |                                    |
    WHERE filters both               WHERE filters only
    staff AND doctor                 staff rows
         |                                    |
    Staff with only                  Staff with only
    deleted doctors                  deleted doctors
    DISAPPEAR from results           APPEAR with NULL doctor
```

## How we implemented it

The join planner tracks whether each joined entity has a `deletedAt` column:

```typescript
export interface JoinSpec {
  type: 'LEFT';
  parentAlias: string;
  relationProperty: string;
  alias: string;
  depth: number;
  hasDeletedAt: boolean;  // <-- this flag
}
```

The query builder uses that flag to conditionally add the soft-delete filter to the JOIN ON clause:

```typescript
for (const joinSpec of joinPlanner.getJoins()) {
  const joinPath = `${joinSpec.parentAlias}.${joinSpec.relationProperty}`;

  if (joinSpec.hasDeletedAt) {
    // Soft-delete check on the JOIN condition
    qb.leftJoin(
      joinPath,
      joinSpec.alias,
      `${joinSpec.alias}.deletedAt IS NULL`
    );
  } else {
    // No soft-delete column, plain join
    qb.leftJoin(joinPath, joinSpec.alias);
  }
}

// Root entity always gets a WHERE clause
qb.andWhere('root.deletedAt IS NULL');
```

The `hasDeletedAt` flag is determined by inspecting the entity metadata at startup. If the entity has a column mapped to `deletedAt`, the flag is true. No manual configuration needed.

## The key insight

The soft-delete check must live in different places depending on whether you are filtering the root entity or a joined entity:

| Entity position | Where to check `deletedAt` | Why |
|-----------------|---------------------------|-----|
| Root (FROM clause) | WHERE clause | Standard filtering |
| Joined entity | JOIN ON clause | Preserves LEFT JOIN semantics |

Putting both in WHERE turns your LEFT JOIN into an accidental INNER JOIN for rows with deleted related records. Putting the joined entity's check in the ON clause lets the LEFT JOIN do its job: return the parent row with NULLs when there is no qualifying child.

This is one of those bugs that does not cause errors, does not crash anything, and passes most tests. It silently returns wrong data. The only way to catch it is to have test cases where a related entity is soft-deleted and the parent entity should still appear in results.
