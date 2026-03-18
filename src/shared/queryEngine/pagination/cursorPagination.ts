import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { SortField } from '../types/query.types';
import { CursorPage, CursorMeta } from '../types/result.types';

export type CursorValues = Record<string, string | number | null>;

/**
 * Encodes cursor values to a base64url string.
 * Format: base64url(JSON.stringify({ field: value, ... }))
 */
export function encodeCursor(values: CursorValues): string {
  const json = JSON.stringify(values);
  return Buffer.from(json).toString('base64url');
}

/**
 * Decodes a base64url cursor string back to cursor values.
 * @throws Error if the cursor string is malformed or invalid JSON.
 */
export function decodeCursor(cursor: string): CursorValues {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Not a plain object');
    }
    return parsed as CursorValues;
  } catch {
    throw new Error('Invalid cursor: failed to decode');
  }
}

/**
 * Returns the effective sort fields, always ensuring `id` is the final tiebreaker
 * if it is not already present in the sort list.
 */
export function getEffectiveSortFields(sort: SortField[]): SortField[] {
  const hasId = sort.some((sf) => sf.field === 'id' || sf.field.endsWith('.id'));
  if (hasId) return sort;
  return [...sort, { field: 'id', dir: 'ASC' as const }];
}

/**
 * Builds a cursor WHERE clause for multi-column cursor pagination.
 *
 * For sort=[-date, id] with cursor { date: '2024-01-01', id: '5' }:
 *   root.date < :cur_0
 *   OR (root.date = :cur_0_eq AND root.id > :cur_1)
 *
 * Pattern for N columns:
 *   (col1 op1 :v1)
 *   OR (col1 = :v1 AND col2 op2 :v2)
 *   OR (col1 = :v1 AND col2 = :v2 AND col3 op3 :v3)
 *
 * Operators:
 *   - DESC → '<' (next page moves to smaller values)
 *   - ASC  → '>' (next page moves to larger values)
 */
export function buildCursorWhereClause(
  sortFields: SortField[],
  cursorValues: CursorValues,
  aliasResolver: (field: string) => { alias: string; column: string },
): { sql: string; params: Record<string, unknown> } {
  const params: Record<string, unknown> = {};
  const orClauses: string[] = [];

  for (let i = 0; i < sortFields.length; i++) {
    const andParts: string[] = [];

    // Equality conditions for all preceding columns
    for (let j = 0; j < i; j++) {
      const sf = sortFields[j];
      const { alias, column } = aliasResolver(sf.field);
      const paramKey = `cur_${j}_eq`;
      const value = cursorValues[sf.field];

      if (value === null || value === undefined) {
        andParts.push(`${alias}.${column} IS NULL`);
      } else {
        params[paramKey] = value;
        andParts.push(`${alias}.${column} = :${paramKey}`);
      }
    }

    // The directional comparison for the current column
    const sf = sortFields[i];
    const { alias, column } = aliasResolver(sf.field);
    const paramKey = `cur_${i}`;
    const value = cursorValues[sf.field];
    const op = sf.dir === 'DESC' ? '<' : '>';

    if (value === null || value === undefined) {
      // NULL handling: for DESC assume next page wants non-null rows; skip otherwise
      andParts.push(`${alias}.${column} IS NOT NULL`);
    } else {
      params[paramKey] = value;
      andParts.push(`${alias}.${column} ${op} :${paramKey}`);
    }

    orClauses.push(andParts.length === 1 ? andParts[0] : `(${andParts.join(' AND ')})`);
  }

  const sql = orClauses.length === 1 ? orClauses[0] : orClauses.join(' OR ');
  return { sql, params };
}

/**
 * Applies cursor pagination to a SelectQueryBuilder.
 * - Always sets take(limit + 1) to detect hasMore
 * - Applies the cursor WHERE clause if a cursor string is provided
 */
export function applyCursorPagination<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  cursor: string | null,
  sortFields: SortField[],
  limit: number,
  aliasResolver: (field: string) => { alias: string; column: string },
  useRawLimit = false,
): void {
  // Fetch one extra row to detect whether there is a next page.
  // Use raw LIMIT when aggregating — TypeORM's take() wraps JOIN queries in a
  // pagination subquery that references distinctAlias.root_id, which breaks
  // when GROUP BY prevents root.id from being selected.
  if (useRawLimit) {
    qb.limit(limit + 1);
  } else {
    qb.take(limit + 1);
  }

  if (!cursor) return;

  const cursorValues = decodeCursor(cursor);
  const { sql, params } = buildCursorWhereClause(sortFields, cursorValues, aliasResolver);

  if (sql) {
    qb.andWhere(`(${sql})`, params);
  }
}

/**
 * Extracts cursor values from a result row for the given sort fields.
 * Handles nested relation fields such as "doctor.name" by traversing the object.
 */
export function extractCursorValues(
  row: Record<string, unknown>,
  sortFields: SortField[],
): CursorValues {
  const values: CursorValues = {};

  for (const sf of sortFields) {
    const parts = sf.field.split('.');
    let value: unknown = row;

    for (const part of parts) {
      if (value !== null && value !== undefined && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        value = undefined;
        break;
      }
    }

    values[sf.field] = (value === undefined ? null : value) as string | number | null;
  }

  return values;
}

/**
 * Builds a CursorPage<T> for aggregation results from getRawMany().
 * Cursor encoding is not supported for raw/aggregated rows, so nextCursor is always null.
 */
export function buildRawPage<T extends Record<string, unknown>>(
  rows: T[],
  limit: number,
): CursorPage<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  return {
    data,
    meta: {
      nextCursor: null,
      prevCursor: null,
      hasMore,
      limit,
    },
  };
}

/**
 * Builds a CursorPage<T> from the fetched rows (limit + 1).
 *
 * If rows.length > limit, there is a next page:
 * - Drop the extra row from data
 * - Set hasMore = true
 * - Encode nextCursor from the last data row
 */
export function buildCursorPage<T extends Record<string, unknown>>(
  rows: T[],
  limit: number,
  sortFields: SortField[],
  prevCursor: string | null = null,
  totalRecords?: number,
): CursorPage<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && data.length > 0) {
    const lastRow = data[data.length - 1];
    const cursorValues = extractCursorValues(lastRow as Record<string, unknown>, sortFields);
    nextCursor = encodeCursor(cursorValues);
  }

  const meta: CursorMeta = {
    nextCursor,
    prevCursor,
    hasMore,
    limit,
    ...(totalRecords !== undefined ? { totalRecords } : {}),
  };

  return { data, meta };
}
