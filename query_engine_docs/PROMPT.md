Here is the **strongest prompt you can give Claude Code** to generate the **entire production-grade query engine**. This prompt is structured the way **senior teams guide AI coding agents** so the output becomes a **real architecture instead of random code**.

You can paste this **directly into Claude Code**.

---

# Production Query Engine Implementation Prompt

You are a **principal backend engineer and database systems architect with 15+ years experience building high performance backend infrastructure**.

You specialize in:

* query engines
* database optimizations
* ORM internals
* PostgreSQL performance
* scalable API design

Your task is to **implement a production-grade query engine** in **TypeScript** that will power **all GET endpoints** of a large SaaS backend.

The stack is:

* Node.js
* TypeScript
* TypeORM
* PostgreSQL
* Redis (for caching)

This query engine must support **complex filtering, relation traversal, response shaping, hybrid search, and cursor pagination**.

The system must be designed for **large datasets (100M+ rows)** and **high throughput (1000–2000 RPS)**.

Your output must be **production architecture and implementation code**, not simplified examples.

---

# Core Requirements

The engine must support the following query syntax.

Example request:

```id="hyobp1"
GET /appointments?

where=(doctor.department.name='radiology' AND status='scheduled')
   OR (patient.country='USA')

search[doctor.name][fts]=john
search[notes][tri]=fever

fields[appointments]=id,date,status
fields[doctor]=id,name

include=doctor.department

sort=-date,doctor.name

limit=20
cursor=eyJkYXRlIjoiMjAyNS0wMS0wMSIsImlkIjoxMDB9
```

---

# Query Features

The engine must support:

### Filtering

```id="frfehr"
filter[status][eq]=active
filter[age][gte]=18
```

Operators:

```id="nflwqv"
eq
ne
gt
gte
lt
lte
in
nin
between
like
ilike
isNull
notNull
```

---

### Boolean expressions

```id="jgjl6m"
where=(a=1 AND b=2) OR (c=3 AND d=4)
```

---

### Nested relation filters

```id="b36h7d"
doctor.department.hospital.country
```

The system must automatically generate joins.

---

### Response shaping

```id="19r7x4"
fields[appointments]=id,date,status
fields[doctor]=id,name
```

---

### Relation inclusion

```id="0u1j5y"
include=doctor.department
```

---

### Sorting

```id="fgrvl5"
sort=-date,doctor.name
```

---

### Cursor pagination

Cursor pagination must support **multi column sorting**.

Example:

```id="lyydju"
(date,id) < (cursor.date,cursor.id)
```

---

### Hybrid Search

Support:

Full Text Search

```id="0mdykf"
search[doctor.name][fts]=john
```

Trigram search

```id="6h81nk"
search[notes][tri]=fever
```

---

### Aggregations

Support grouping and aggregation queries.

Example:

```id="w8r2mb"
groupBy=doctor.department.id
aggregate[count]=appointments
```

Aggregation filters must work:

```id="3zt2od"
where=count(appointments) > 5
```

---

# Security

Each model must define whitelist rules:

```id="yzff0a"
allowedFilters
allowedSort
allowedSearch
allowedRelations
allowedFields
```

Reject anything not allowed.

---

# Query Limits

Protect the database with limits.

```id="g5v23j"
maxFilters = 30
maxJoins = 8
maxRelationDepth = 4
```

---

# Query Complexity Scoring

Implement query cost scoring.

Example:

| operation   | cost |
| ----------- | ---- |
| filter      | 1    |
| join        | 3    |
| search      | 5    |
| aggregation | 6    |

Queries exceeding limits must be rejected.

---

# Required Architecture

Design the system with the following modules.

```id="prq1ok"
query-engine/
   parser/
   lexer/
   ast/
   planner/
   optimizer/
   sql-builder/
   pagination/
   search/
   validation/
   cache/
```

---

# Implementation Requirements

Your implementation must include:

### 1 Query Grammar

Formal grammar specification.

Example:

```id="ggnpg0"
expression ::= term (OR term)*
term       ::= factor (AND factor)*
factor     ::= condition | "(" expression ")"
condition  ::= field operator value
```

---

### 2 AST Schema

Define TypeScript interfaces.

Example node types:

```id="t1p5pg"
LogicalNode
ConditionNode
AggregateNode
SearchNode
```

---

### 3 Parser

Build a parser that converts the query string into AST.

---

### 4 Join Planner

Automatically detect relation paths and generate joins using TypeORM metadata.

Must:

* deduplicate joins
* enforce join limits
* assign aliases

---

### 5 SQL Builder

Convert AST into optimized SQL using **TypeORM QueryBuilder**.

Must avoid:

* N+1 queries
* redundant joins
* SQL injection

---

### 6 Cursor Pagination Engine

Implement stable cursor pagination.

Cursor must support multiple sort fields.

---

### 7 Hybrid Search Engine

Implement search execution strategy:

* Postgres Full Text Search
* Trigram similarity

Ensure correct indexes are used.

---

### 8 Query Optimizer

Implement optimizations such as:

* join deduplication
* predicate pushdown
* EXISTS optimization

---

### 9 Query Analytics

Log:

* execution time
* joins used
* filters used
* rows returned

---

### 10 Query Cache

Implement Redis caching.

Cache key should be generated from the full query signature.

---

# Code Requirements

The output must include:

1. Full folder structure
2. TypeScript interfaces
3. Parser implementation
4. AST implementation
5. Join planner
6. SQL builder
7. Pagination module
8. Search module
9. Validation module
10. Example usage

The code must be:

* modular
* testable
* production-ready

---

# Performance Requirements

The system must scale to:

```id="q5f86e"
2000 RPS
100M+ rows
p95 latency < 400ms
```

Use:

* Postgres indexes
* join optimization
* cursor pagination

---

# Output Structure

Respond with:

1️⃣ Architecture overview
2️⃣ Folder structure
3️⃣ Query grammar
4️⃣ AST schema
5️⃣ Parser implementation
6️⃣ Join planner algorithm
7️⃣ SQL builder implementation
8️⃣ Pagination engine
9️⃣ Hybrid search implementation
🔟 Example queries

---

# Important Instruction

Design this system **as if it will power every query endpoint in a large SaaS platform**.

Focus on:

* scalability
* security
* performance
* maintainability

Avoid shortcuts or toy examples.

