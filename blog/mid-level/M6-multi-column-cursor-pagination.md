# How we make sure "next page" never skips a row, no matter how many columns you sort by

Single-column cursor pagination has a quiet failure mode. If you are sorting by `created_at` and two rows share the same timestamp, the cursor cannot tell them apart. You end up skipping one, duplicating one, or both. The deeper you paginate, the more likely this becomes.

We fixed it by extending cursors to carry multiple column values and by always ensuring the sort includes a unique tiebreaker.

## The problem with single-column cursors

Imagine paginating through staff records sorted by `created_at DESC`, with a page size of 2:

```
staff table (sorted by created_at DESC):
+----+--------+---------------------+
| id | name   | created_at          |
+----+--------+---------------------+
| 5  | Eve    | 2024-03-01 10:00:00 |
| 4  | Dave   | 2024-03-01 10:00:00 |  <-- same timestamp as Eve
| 3  | Carol  | 2024-02-15 09:00:00 |
| 2  | Bob    | 2024-02-01 08:00:00 |
| 1  | Alice  | 2024-01-15 07:00:00 |
+----+--------+---------------------+
```

Page 1 returns Eve and Dave. The cursor stores `created_at = '2024-03-01 10:00:00'`. Page 2 asks for rows where `created_at < '2024-03-01 10:00:00'`. That skips any row with exactly that timestamp, which is correct here since we already showed both.

But what if the page size is 1? Page 1 returns Eve with cursor `created_at = '2024-03-01 10:00:00'`. Page 2 asks for `created_at < '2024-03-01 10:00:00'`, which skips Dave entirely. Dave has the same timestamp but was never shown.

## The bookmark analogy

Think of a book with chapters and page numbers. If you bookmark by chapter alone, and two chapters have the same name (say, "Introduction" appears twice), your bookmark is ambiguous. You need both the chapter name and the page number to find your exact spot.

A cursor is a bookmark. For it to be unambiguous, it must carry enough information to identify one exact position in the sorted sequence.

## The tiebreaker: always append a unique column

The simplest fix is to ensure the sort always includes a column with unique values. In our case, that is `id`:

```typescript
export function getEffectiveSortFields(sort: SortField[]): SortField[] {
  const hasId = sort.some(
    (sf) => sf.field === 'id' || sf.field.endsWith('.id')
  );
  if (hasId) return sort;
  return [...sort, { field: 'id', dir: 'ASC' }];
}
```

If the user sorts by `[-createdAt]`, the effective sort becomes `[-createdAt, +id]`. Now every row has a unique position in the sort order, even if timestamps collide.

```
User requests:  sort=-createdAt
Effective sort: sort=-createdAt,+id

+----+--------+---------------------+
| id | name   | created_at          |  Sort position
+----+--------+---------------------+
| 5  | Eve    | 2024-03-01 10:00:00 |  1st (same date, but id=5 > id=4)
| 4  | Dave   | 2024-03-01 10:00:00 |  2nd
| 3  | Carol  | 2024-02-15 09:00:00 |  3rd
| 2  | Bob    | 2024-02-01 08:00:00 |  4th
| 1  | Alice  | 2024-01-15 07:00:00 |  5th
+----+--------+---------------------+
```

## The multi-column WHERE clause

With one sort column, the cursor WHERE is simple: `created_at < :cursor_value`. With two columns, it gets more interesting. You need to express "give me rows that come after this exact position in the two-dimensional sort."

The pattern is a series of OR clauses, where each clause handles one level of the sort:

**1 column** (`-date`): simple comparison

```sql
WHERE date < :cur_0
```

**2 columns** (`-date, +id`): the current column OR equality-on-previous AND current

```sql
WHERE date < :cur_0
   OR (date = :cur_0_eq AND id > :cur_1)
```

**3 columns** (`-date, -priority, +id`):

```sql
WHERE date < :cur_0
   OR (date = :cur_0_eq AND priority < :cur_1)
   OR (date = :cur_0_eq AND priority = :cur_1_eq AND id > :cur_2)
```

The logic: for each sort column, either the row is "past" the cursor on that column alone, or it is equal on all preceding columns and "past" on the current one.

```
Sort: [-date, +id]     Cursor: { date: '2024-03-01', id: 4 }

Clause 1:  date < '2024-03-01'
           Matches rows from Feb, Jan, etc.
           (clearly "after" our cursor in DESC date order)

Clause 2:  date = '2024-03-01' AND id > 4
           Same date, but higher id
           (the tiebreaker kicks in)

Combined: rows that come after (2024-03-01, id=4) in the sort order
```

Here is the code that builds this:

```typescript
export function buildCursorWhereClause(sortFields, cursorValues, aliasResolver) {
  const orClauses = [];

  for (let i = 0; i < sortFields.length; i++) {
    const andParts = [];

    // Equality for all preceding columns
    for (let j = 0; j < i; j++) {
      andParts.push(`${alias}.${column} = :${paramKey}_eq`);
    }

    // Directional comparison for current column
    const op = sortFields[i].dir === 'DESC' ? '<' : '>';
    andParts.push(`${alias}.${column} ${op} :${paramKey}`);

    orClauses.push(andParts.join(' AND '));
  }

  return orClauses.join(' OR ');
}
```

## The cursor payload

The cursor encodes the values of all sort columns for the last row on the current page:

```typescript
// Last row on page: { id: 4, name: 'Dave', created_at: '2024-03-01' }
// Sort: [-createdAt, +id]

const cursorValues = {
  created_at: '2024-03-01T10:00:00.000Z',
  id: 4,
};

const encoded = encodeCursor(cursorValues);
// "eyJjcmVhdGVkX2F0IjoiMjAyNC0wMy0wMVQxMDowMDowMC4wMDBaIiwiaWQiOjR9"
```

```
Response:
{
  "data": [ ... ],
  "meta": {
    "nextCursor": "eyJjcmVhdGVkX2F0IjoiMjAyNC...",
    "hasMore": true,
    "limit": 20
  }
}

Next request:
GET /staff?sort=-createdAt&cursor=eyJjcmVhdGVkX2F0IjoiMjAyNC...

Decoded cursor: { created_at: '2024-03-01', id: 4 }

WHERE clause: created_at < '2024-03-01'
              OR (created_at = '2024-03-01' AND id > 4)
```

## Handling NULL values

NULL complicates comparisons because `NULL < anything` is NULL (not true or false) in SQL. When a cursor value is NULL, the WHERE clause must use `IS NULL` for equality and special handling for directional comparisons.

In practice, we avoid this problem by only allowing NOT NULL columns in sort configurations. The tiebreaker column (`id`) is always NOT NULL, and most sort fields like `createdAt` are also NOT NULL by schema design. If a nullable column must be sortable, the cursor builder generates `COALESCE` expressions to normalize NULLs to a known boundary value.

## The expansion pattern

The number of OR clauses equals the number of sort columns. For most queries (1-3 sort columns), this is trivial. But the pattern scales correctly even for more columns:

| Sort columns | OR clauses | AND conditions in longest clause |
|-------------|------------|----------------------------------|
| 1 | 1 | 1 |
| 2 | 2 | 2 |
| 3 | 3 | 3 |
| N | N | N |

Each additional sort column adds one OR clause and one AND condition to the longest clause. The query remains efficient because PostgreSQL can use a composite index that matches the sort order, and the OR/AND structure maps cleanly to index range scans.

The tiebreaker column guarantees uniqueness. The multi-column WHERE clause guarantees correctness. Together, they ensure that no row is ever skipped or duplicated, regardless of how many columns the user sorts by.
