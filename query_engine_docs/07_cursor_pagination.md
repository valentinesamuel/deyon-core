# Cursor Pagination Algorithm

Cursor pagination ensures stable ordering.

Example sort:

sort=-date,id

Cursor payload:

{
  "date": "2025-01-01",
  "id": 100
}

Algorithm:

1. Encode cursor values as JSON
2. Base64 encode cursor
3. On request decode cursor
4. Apply comparison:

(date,id) < (cursor.date,cursor.id)

SQL Example:

WHERE
(date < '2025-01-01')
OR
(date = '2025-01-01' AND id < 100)