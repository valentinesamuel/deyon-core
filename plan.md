# Blog Post Series Plan: Query Engine

## Context

The `QueryEngineModule` in `src/query-engine/` is a production-grade NestJS query compilation
pipeline built to replace a basic `findAndPaginate` utility that couldn't scale beyond simple
use cases. The engine covers: lexing/parsing filter DSL strings into an AST, validation with
whitelist enforcement, complexity scoring, join planning, SQL building via TypeORM, hybrid
text search, cursor pagination, Redis caching, and structured analytics.

This plan covers 13 blog posts derived from that implementation. Posts will be published to
a personal blog first, then cross-posted to Hashnode and Dev.to.

**Global style rules across all posts:**

- Titles must be accessible — no raw jargon (no "AST", "DSL", "predicate pushdown", "trigram",
  "FTS" in titles)
- Heavy use of images and illustrations; every major concept should have a visual analogy
  simple enough for a non-developer to grasp
- **All illustrations must be written in Markdown** — use ASCII art, Unicode box-drawing
  characters, Mermaid diagrams (```mermaid blocks), comparison tables, and annotated code
  blocks. No external image files or image embeds.
- Code: simplified/illustrative snippets or conceptual diagrams only (not raw source files)
- No AI-sounding openers or section headers ("In this article we will explore...")

---

## Post List

### Junior — Tutorial-first, simplified examples

---

**Post J1**
**Title:** `Why your "next page" button gets slower the deeper you go`
**One-liner:** A plain-English walkthrough of why OFFSET pagination quietly breaks on large
tables — and how cursor-based pagination fixes it with a real-world analogy and code you can
follow.
**Audience:** Junior backend developers
**Tone:** Tutorial-first, friendly
**Illustrations needed:**

- A bookshelf analogy: OFFSET = counting from page 1 every time vs cursor = bookmark
- A diagram showing Postgres scanning 50,000 rows just to return 20
- Side-by-side SQL showing OFFSET vs cursor WHERE clause

---

**Post J2**
**Title:** `Your API probably lets users search columns you never intended. Here's the fix.`
**One-liner:** A beginner-friendly look at why passing raw filter params straight to your
database is a real security problem — and how a simple whitelist configuration closes the door.
**Audience:** Junior backend developers
**Tone:** Tutorial-first, light narrative
**Illustrations needed:**

- A bouncer analogy: whitelist = bouncer with a guest list
- Diagram: request params → whitelist check → DB vs request params → DB (no check)
- Example config object showing allowedFilters

---

**Post J3**
**Title:** `From .find() to real queries: how to ask your database smarter questions`
**One-liner:** If you've only ever used `.findOne()` and `.findAndCount()`, this is a
step-by-step intro to TypeORM's query builder — what it is, why it exists, and when you
actually need it.
**Audience:** Junior backend developers
**Tone:** Tutorial-first, step-by-step
**Illustrations needed:**

- Analogy: `.find()` is ordering from a fixed menu vs query builder is telling the chef exactly what you want
- Progression diagram: entity → repository → query builder → SQL

---

### Mid-level — Concept + illustrative code snippets

---

**Post M1**
**Title:** `How we let users write filter expressions in a URL — and turned them into real database queries`
**One-liner:** Breaking down how a hand-written scanner and parser turn
`where=(role='admin' OR status='active')` into a structured tree your backend can safely
validate, optimize, and execute.
**Audience:** Mid-level backend developers
**Tone:** Concept + simplified code
**Illustrations needed:**

- The "words → grammar → meaning" analogy for lexer/parser
- Visual of token stream → AST tree diagram
- Side-by-side: bracket params vs DSL string → same AST

---

**Post M2**
**Title:** `How we built a speed bump for database queries before they get out of hand`
**One-liner:** A scoring system that assigns costs to joins, filters, and text search — and
rejects any query over budget before it even touches the database.
**Audience:** Mid-level backend developers
**Tone:** Concept + simplified code
**Illustrations needed:**

- Analogy: taxi meter — each filter/join adds to the fare; over budget = no ride
- Score breakdown table (filter=1, join=3, search=5, aggregation=6)
- Flow diagram: query → scorer → gate → DB (or rejection)

---

**Post M3**
**Title:** `How we made sure the same search always hits the cache, even when the URL params are shuffled`
**One-liner:** The trick behind deterministic Redis cache keys: stable JSON serialization +
SHA-256 hashing, so `?status=active&role=admin` and `?role=admin&status=active` are treated
as the same query.
**Audience:** Mid-level backend developers
**Tone:** Concept + simplified code
**Illustrations needed:**

- Analogy: two people ordering "burger with fries, no pickles" vs "no pickles, fries, burger" — same order
- Diagram: params object → sort keys → serialize → hash → Redis key
- TTL invalidation flow diagram

---

**Post M4**
**Title:** `The deleted-data bug that appears when you start joining tables`
**One-liner:** Adding `deleted_at IS NULL` to your root query is not enough. Here's what
slips through when you forget the same check on your JOIN conditions — and how to automate it.
**Audience:** Mid-level backend developers
**Tone:** Concept + simplified code
**Illustrations needed:**

- Venn diagram: soft-deleted staff appearing via unguarded JOIN
- Before/after SQL showing JOIN ON with and without deletedAt check
- Illustration of "ghost rows" sneaking through a join

---

**Post M5**
**Title:** `PostgreSQL has two ways to search text. Here's when to use each — and how to use both at once.`
**One-liner:** Full-text search and fuzzy/similarity search solve different problems. This
post shows how to pick the right one per field and wire them together in a single query.
**Audience:** Mid-level backend developers
**Tone:** Concept + simplified code
**Illustrations needed:**

- "Library card catalog" (FTS) vs "autocomplete with typos" (trigram) illustration
- Side-by-side: what each approach returns for a misspelled search term
- Config snippet showing per-field search type selection

---

**Post M6**
**Title:** `How we make sure "next page" never skips a row, no matter how many columns you sort by`
**One-liner:** A step-by-step look at the WHERE clause expansion that makes multi-column cursor
pagination stable — and why missing a single tiebreaker causes silent data gaps.
**Audience:** Mid-level backend developers
**Tone:** Concept + simplified code
**Illustrations needed:**

- "Bookmark in a book sorted by two criteria" analogy
- Visual expansion of OR+AND SQL pattern for 2-column and 3-column cursors
- Diagram: last row values → encoded cursor → next page WHERE clause

---

**Post M7**
**Title:** `When joining a table just to filter it is secretly more work than it needs to be`
**One-liner:** When a JOIN contributes no columns to the SELECT list, rewriting it as a
subquery check often runs faster — here's how to spot those cases and what the difference
looks like.
**Audience:** Mid-level backend developers
**Tone:** Concept + simplified code
**Illustrations needed:**

- Analogy: asking a colleague to attend a meeting just to answer one yes/no question vs
  sending them a quick message instead
- SQL side-by-side: LEFT JOIN vs EXISTS subquery
- Diagram: filter-only join detection logic

---

**Post M8**
**Title:** `How we let users build complex filters without letting them break the database`
**One-liner:** Supporting AND/OR boolean logic in API filters is only safe if you also enforce
field whitelists, depth limits, join caps, and a total complexity budget — here's how all of
those work together.
**Audience:** Mid-level backend developers
**Tone:** Concept + simplified code
**Illustrations needed:**

- Analogy: a form with guardrails vs an open text field
- Layered defense diagram: whitelist → depth check → join cap → complexity gate
- Error response shape with structured `code` + `details`

---

### Senior — Story-driven + deep dive / essay

---

**Post S1**
**Title:** `We outgrew our findAndPaginate helper. Replacing it took six layers and a lot of second-guessing.`
**One-liner:** The full story of designing a production query engine in NestJS — the
architectural decisions across every layer, the trade-offs we wrestled with, and the parts
we'd revisit if we started today.
**Audience:** Senior backend developers
**Tone:** Story-driven, candid, architectural
**Illustrations needed:**

- Timeline: old utility → pain points → design phases → final architecture
- Full pipeline diagram (same as the blog post's ASCII — but as a real illustration)
- Decision matrix for key architectural choices (AST vs direct QB, cursor vs offset, etc.)

---

**Post S2**
**Title:** `The three query tricks we built into our optimizer — and two we wish we'd added from day one`
**One-liner:** Selectivity reordering, filter-only join detection, and condition pushdown:
what each optimization does, when it actually helps, and an honest look at what we left out.
**Audience:** Senior backend developers
**Tone:** Deep-dive essay, opinionated, retrospective
**Illustrations needed:**

- Analogy for selectivity: filtering a crowd — check ID first, then coat color
- Before/after query plan diff (conceptual, not raw EXPLAIN output)
- "Future iterations" section with illustrated wishlist (prepared statement cache, auto-invalidation)

---

## Illustration Format (applies to every post)

All visuals must be pure Markdown — no image embeds, no external assets. Allowed forms:

- **ASCII / Unicode diagrams** — flow diagrams, before/after comparisons, pipeline stages
- **Mermaid diagrams** — ```mermaid flowchart, sequenceDiagram, or graph blocks
- **Comparison tables** — `| Option A | Option B |` with clear headers
- **Annotated code blocks** — fenced code with inline comments explaining each line

Example of an acceptable ASCII diagram:

```
 User request
      │
      ▼
 ┌──────────┐     ┌──────────┐
 │ Whitelist│────▶│ DB Query │
 │  Check   │     │          │
 └──────────┘     └──────────┘
      │
   Blocked ❌
```

---

## Verification

Once posts are drafted:

1. Read each post aloud — if it sounds like a press release, rewrite the opener
2. Every concept section should have at least one Markdown illustration (ASCII, Mermaid, or table)
3. Junior posts: a non-developer should be able to follow the analogy without reading the code
4. Mid-level posts: a developer who hasn't seen the codebase should understand the "why" before the "how"
5. Senior posts: the retrospective/candid sections should feel like a real engineer talking, not a tutorial
6. Cross-check titles: no raw jargon (AST, DSL, trigram, FTS, predicate pushdown) in any final title
