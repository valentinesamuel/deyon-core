# Why your "next page" button gets slower the deeper you go

You click "Next" on page 2. Fast. Page 10. Still fine. Page 50. A little sluggish. Page 500. The spinner hangs for five seconds. Your database is doing the same work it always does, so why is page 500 so much slower than page 2?

The answer is hiding in one small word: **OFFSET**.

## How OFFSET pagination works (and why it falls apart)

Most tutorials teach pagination like this:

```sql
-- Page 1
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 0;

-- Page 2
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 20;

-- Page 500
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 9980;
```

That last query looks innocent, but here is what PostgreSQL actually has to do:

```
Page 500 request arrives
        |
        v
+---------------------------+
|  Sort ALL matching rows   |
|  by created_at DESC       |
+---------------------------+
        |
        v
+---------------------------+
|  Walk through row 1       |
|  Walk through row 2       |
|  ...                      |
|  Walk through row 9,980   |  <-- all discarded
|  KEEP rows 9,981 - 10,000 |  <-- these 20 are returned
+---------------------------+
```

The database **counts from the beginning every single time**. It cannot jump ahead. OFFSET 9980 means "read 9,980 rows, throw them away, then give me the next 20."

## The bookshelf analogy

Imagine you have a bookshelf with 10,000 books sorted by title. A friend asks you for the book at position 9,981.

**OFFSET approach:** Start at the left end. Count books one by one. 1... 2... 3... all the way to 9,981. Hand over the book. Tomorrow your friend asks for book 9,982, and you start counting from the left again.

**Cursor approach:** You slide a bookmark into the shelf right after the last book you handed over. Next time, you open the shelf at the bookmark and grab the next one. No counting.

That bookmark is a **cursor**.

## What a cursor actually looks like

Instead of telling the database "skip 9,980 rows," we tell it "give me rows that come after this specific point." The cursor encodes the values we need to find that point.

```typescript
// A cursor is just the sort-column values of the last row, encoded
export function encodeCursor(values: CursorValues): string {
  const json = JSON.stringify(values);
  return Buffer.from(json).toString('base64url');
}

export function decodeCursor(cursor: string): CursorValues {
  const json = Buffer.from(cursor, 'base64url').toString('utf8');
  return JSON.parse(json);
}
```

So if the last row on your current page has `created_at = '2024-01-15'` and `id = 42`, the cursor might look like:

```
eyJjcmVhdGVkX2F0IjoiMjAyNC0wMS0xNSIsImlkIjo0Mn0
```

Which decodes to:

```json
{ "created_at": "2024-01-15", "id": 42 }
```

## OFFSET SQL vs cursor SQL

Here is the difference side by side:

| | OFFSET | Cursor |
|---|---|---|
| **SQL** | `SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 9980` | `SELECT * FROM orders WHERE created_at < '2024-01-15' OR (created_at = '2024-01-15' AND id > 42) ORDER BY created_at DESC, id ASC LIMIT 21` |
| **DB work** | Sort everything, skip 9,980 rows | Jump to the index position, read 21 rows |
| **Speed on page 500** | Slow (linear with page number) | Same speed as page 1 |
| **Can jump to page N?** | Yes | No (you must page forward sequentially) |

The cursor WHERE clause looks more complicated, but the database can use an index to jump directly to the right spot. No scanning, no discarding.

## The "fetch one extra" trick

Notice the cursor query asks for `LIMIT 21` instead of `LIMIT 20`. That extra row is a peek ahead:

```typescript
export function buildCursorPage<T>(rows: T[], limit: number, sortFields: SortField[], prevCursor: string | null = null, totalRecords?: number): CursorPage<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? encodeCursor(extractCursorValues(data[data.length - 1], sortFields))
    : null;

  return {
    data,
    meta: { nextCursor, prevCursor: null, hasMore, limit, totalRecords },
  };
}
```

```
Request: LIMIT 21

Case 1: DB returns 21 rows        Case 2: DB returns 15 rows
  |                                  |
  v                                  v
  hasMore = true                     hasMore = false
  Return first 20 rows              Return all 15 rows
  nextCursor = values from           nextCursor = null
               row #20
```

If we get 21 rows back, there is at least one more page. We chop off the extra row and build a cursor from the last row we keep. If we get fewer than 21, we have reached the end.

The API response looks like this:

```json
{
  "data": [ ... 20 items ... ],
  "meta": {
    "nextCursor": "eyJjcmVhdGVkX2F0Ijoi...",
    "prevCursor": null,
    "hasMore": true,
    "limit": 20,
    "totalRecords": 1000
  }
}
```

The client sends `?cursor=eyJjcmVhdGVkX2F0Ijoi...` to get the next page. No page numbers, no offset math.

## The trade-off

Cursor pagination is not strictly better in every scenario. Here is where each approach fits:

| Scenario | Best approach |
|---|---|
| User browses a feed (infinite scroll) | Cursor |
| User jumps to page 347 directly | OFFSET (cursor cannot do this) |
| Dataset has frequent inserts/deletes | Cursor (OFFSET can skip or duplicate rows) |
| Admin dashboard with < 1,000 total rows | Either works fine |
| Public API with unpredictable depth | Cursor |

If your users never need to jump to an arbitrary page, cursor pagination gives you consistent speed at any depth. That is why we chose it for our query engine, and why that page-500 spinner does not have to exist.
