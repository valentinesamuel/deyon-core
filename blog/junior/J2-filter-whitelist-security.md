# Your API probably lets users search columns you never intended. Here's the fix.

Picture this: you built a nice API for listing users. It supports filtering so the frontend can show only active users, or users in a specific role. The URL looks like:

```
GET /api/users?filter=status='active'
```

And your code takes that filter field name, plugs it into a database query, and returns results. Works great.

Now imagine someone sends this:

```
GET /api/users?filter=passwordHash='$2b$10$abc...'
```

Or this:

```
GET /api/users?filter=internalNotes LIKE '%fired%'
```

If your API blindly accepts any field name the user sends, it will happily query those columns too. You have accidentally given every API consumer the ability to search your entire database schema, including columns that were never meant to be exposed.

## The problem: trusting user input as column names

Most filter implementations start simple. The user sends a field name and a value, and you build a WHERE clause:

```
User sends: field = "status", value = "active"
You build:  WHERE status = 'active'
```

The moment you skip checking whether `status` is a field you intended to expose, you have an open door. An attacker does not even need to guess column names. They can try common ones (`password`, `secret`, `ssn`, `salary`) or look at error messages that leak schema details.

```
+------------------+       +------------------+       +------------------+
|   User Request   | ----> |   Your API       | ----> |   Database       |
|                  |       |   (no checking)  |       |                  |
|  field: "salary" |       |  WHERE salary    |       |  Returns salary  |
|  op: ">"         |       |    > 100000      |       |  data to user    |
|  value: "100000" |       |                  |       |                  |
+------------------+       +------------------+       +------------------+

                     PROBLEM: no one checked if "salary" is allowed
```

## The bouncer analogy

Think of your API as a nightclub. The database is the VIP area in the back. Every filter field a user sends is a person claiming they are on the guest list.

Without a whitelist, there is no bouncer. Anyone who walks up and says "I'm salary" gets waved through.

With a whitelist, there is a bouncer holding a clipboard. The clipboard has three names on it: `status`, `role`, `createdAt`. Anyone not on the list gets turned away at the door.

```
           Guest List (allowedFilters)
           +--------------------------+
           | status                   |
           | role                     |
           | createdAt                |
           +--------------------------+

"status" arrives   --> Bouncer checks list --> ON THE LIST    --> Welcome in
"salary" arrives   --> Bouncer checks list --> NOT ON THE LIST --> Rejected
"passwordHash"     --> Bouncer checks list --> NOT ON THE LIST --> Rejected
```

## How the whitelist works in practice

First, each entity defines exactly which fields can be filtered:

```typescript
const staffQueryConfig = {
  allowedFilters: ['status', 'role', 'email', 'createdAt'],
  allowedSort: ['createdAt', 'email'],
  allowedSearch: ['name', 'email'],
  maxFilters: 10,
};
```

When a request comes in, the filter expression gets parsed into a tree structure. Then we walk that tree and collect every field name the user referenced:

```typescript
function collectFields(node, fields) {
  if (!node) return;
  // If this is an AND or OR, check all children
  if (node.type === 'AND' || node.type === 'OR') {
    for (const child of node.children) {
      collectFields(child, fields);
    }
    return;
  }
  // If this is a condition like status = 'active', grab the field name
  if (node.type === 'CONDITION') {
    fields.add(node.field);
  }
}
```

Then we compare every collected field against the whitelist:

```
User's filter: status = 'active' AND salary > 100000

Collected fields: { "status", "salary" }

Check against allowedFilters: ["status", "role", "email", "createdAt"]

  status  --> allowed
  salary  --> NOT allowed  --> REJECT THE ENTIRE REQUEST
```

## What the rejection looks like

When a field fails validation, the API returns a clear error. No database query runs at all.

```json
{
  "code": "QUERY_VALIDATION_ERROR",
  "message": "Filter field 'salary' is not allowed",
  "details": {
    "field": "salary",
    "allowed": ["status", "role", "email", "createdAt"]
  }
}
```

The response tells the caller exactly what went wrong and what they can use instead. The database never sees the request.

## The full flow with the whitelist in place

```
+------------------+       +------------------+       +------------------+
|   User Request   | ----> |   Validator      | ----> |   Database       |
|                  |       |                  |       |                  |
|  field: "salary" |       |  1. Parse filter |       |  Never reached   |
|  op: ">"         |       |  2. Collect fields|      |                  |
|  value: "100000" |       |  3. Check against |      |                  |
|                  |       |     allowedFilters|       |                  |
|                  |       |  4. "salary" not  |       |                  |
|                  |       |     on list       |       |                  |
|                  |       |  5. Return 400    |       |                  |
+------------------+       +------------------+       +------------------+
```

| Without whitelist | With whitelist |
|---|---|
| User can filter by any column | User can only filter by approved columns |
| Internal fields are exposed | Internal fields are invisible |
| Attacker can probe your schema | Attacker gets a 400 error |
| Database runs every query | Database only runs validated queries |

## It is not just about security

The whitelist also protects performance. If a user filters on a column that has no database index, the query could scan millions of rows. By restricting filters to columns you have indexed and optimized for, you keep query performance predictable.

It is a small piece of code, a Set lookup against a list of strings, but it is one of those pieces where skipping it means handing the keys to your database schema to anyone with a URL bar.

Every field your API accepts should be a deliberate choice, not an accident.
