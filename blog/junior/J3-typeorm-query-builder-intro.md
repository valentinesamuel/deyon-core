# From .find() to real queries: how to ask your database smarter questions

If you have used TypeORM before, you probably started with something like this:

```typescript
const user = await userRepository.findOne({ where: { id: 1 } });
```

Simple. Clean. And for basic lookups, perfectly fine. But the moment you need to filter across related tables, add conditional sorting, or build a search feature, `.find()` starts to feel like ordering from a fixed menu when you really need to talk to the chef.

## The fixed menu vs the chef

Think of a restaurant. The `.find()` and `.findOne()` methods are the fixed menu. You pick option A, B, or C. The kitchen knows exactly how to prepare each one. Fast, reliable, no surprises.

But what if you want the pasta from option A, the sauce from option C, and no onions? The fixed menu cannot do that. You need to walk into the kitchen and tell the chef exactly what you want.

That is what the **query builder** gives you. Same kitchen, same ingredients, but you describe the dish step by step.

```
Fixed Menu (.find)                   Custom Order (Query Builder)
+---------------------------+        +---------------------------+
|  Option A: findOne by ID  |        |  1. Start with Staff      |
|  Option B: find with      |        |  2. Join the Doctor table |
|            simple where   |        |  3. Filter by status      |
|  Option C: findAndCount   |        |  4. Sort by created date  |
|            with relations |        |  5. Take first 20 rows    |
+---------------------------+        +---------------------------+
     Limited combinations                 You control every step
```

## The progression: from simple to powerful

TypeORM gives you several ways to talk to the database, from most convenient to most flexible:

| Level | Method | Flexibility | When to use |
|-------|--------|-------------|-------------|
| 1 | `repository.findOne()` | Low | Fetch a single record by ID or simple condition |
| 2 | `repository.find()` | Low-Medium | Fetch multiple records with basic filters and relations |
| 3 | `repository.createQueryBuilder()` | High | Complex joins, subqueries, conditional logic |
| 4 | Raw SQL | Full | Database-specific features, performance-critical paths |

Most applications live at levels 1-2 for 80% of their queries. But the remaining 20% is where the query builder earns its keep.

## Your first query builder

Here is a `.find()` call and its query builder equivalent:

```typescript
// Level 2: find()
const staff = await staffRepository.find({
  where: { status: 'active' },
  order: { createdAt: 'DESC' },
  take: 20,
});

// Level 3: query builder (same result)
const staff = await staffRepository
  .createQueryBuilder('root')
  .where('root.status = :status', { status: 'active' })
  .orderBy('root.createdAt', 'DESC')
  .limit(20)
  .getMany();
```

The query builder version is more verbose, but look at what we gained: every part of the query is a separate method call. We can add or remove pieces based on conditions.

## Adding a JOIN

This is where the query builder starts to shine. Suppose you want all staff members who have an associated doctor record in the cardiology department:

```typescript
const staff = await staffRepository
  .createQueryBuilder('root')
  .leftJoin('root.doctor', 'root_doctor')
  .where('root.status = :status', { status: 'active' })
  .andWhere('root_doctor.department = :dept', { dept: 'cardiology' })
  .orderBy('root.createdAt', 'DESC')
  .limit(20)
  .getMany();
```

Here is what that builds:

```sql
SELECT root.*
FROM staff root
LEFT JOIN doctor root_doctor ON root_doctor.staff_id = root.id
WHERE root.status = 'active'
  AND root_doctor.department = 'cardiology'
ORDER BY root.created_at DESC
LIMIT 20
```

Try doing that with `.find()`. You can load relations with `{ relations: ['doctor'] }`, but filtering on a related table's column? That is query builder territory.

## Building queries dynamically

The real power comes from building queries piece by piece based on what the user asked for:

```typescript
const qb = staffRepository.createQueryBuilder('root');

// Always filter soft-deleted records
qb.where('root.deletedAt IS NULL');

// Only add the join if the user is filtering by doctor fields
if (needsDoctorJoin) {
  qb.leftJoin('root.doctor', 'root_doctor');
}

// Only add the status filter if the user provided one
if (filters.status) {
  qb.andWhere('root.status = :status', { status: filters.status });
}

// Apply sorting
qb.orderBy('root.createdAt', 'DESC');

// Apply pagination
qb.limit(21); // fetch one extra to detect "has more"

const results = await qb.getMany();
```

```
User request: GET /staff?status=active&sort=-createdAt&include=doctor

         +---> createQueryBuilder('root')
         |
         +---> .where('root.deletedAt IS NULL')       (always)
         |
         +---> .leftJoin('root.doctor', 'root_doctor') (because include=doctor)
         |
         +---> .andWhere('root.status = :status')      (because status filter)
         |
         +---> .orderBy('root.createdAt', 'DESC')      (because sort=-createdAt)
         |
         +---> .limit(21)                               (pagination)
         |
         v
      Final SQL query sent to PostgreSQL
```

Each piece is added only when needed. The query builder assembles the final SQL from whatever pieces you give it.

## A note on safety

Notice the `:status` syntax in the WHERE clause:

```typescript
qb.andWhere('root.status = :status', { status: filters.status });
```

That `:status` is a **parameter placeholder**. TypeORM replaces it with the actual value safely, preventing SQL injection. Never do this:

```typescript
// DANGEROUS: user input directly in the SQL string
qb.andWhere(`root.status = '${filters.status}'`);
```

Always use parameter placeholders. Always.

## Where this leads

The query engine we built in this project is essentially a system that constructs query builder calls automatically. A user sends a URL with filters, sorts, and pagination params. The engine parses those params, validates them, plans which joins are needed, and then calls the same `.createQueryBuilder()`, `.leftJoin()`, `.where()`, and `.orderBy()` methods you saw above.

The query builder is the foundation. Everything else, the filter parsing, the validation, the optimization, is about deciding which builder methods to call and in what order.

If you are comfortable with what you saw in this post, you have the vocabulary to follow the rest of the series.
