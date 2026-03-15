import { describe, it, expect } from 'vitest';
import {
  encodeCursor,
  decodeCursor,
  getEffectiveSortFields,
  buildCursorWhereClause,
  extractCursorValues,
  buildCursorPage,
  CursorValues,
} from './cursorPagination';
import { SortField } from '../types/query.types';

// Simple alias resolver for tests: "a.b.c" → alias="root_a_b", column="c"
const resolver = (field: string): { alias: string; column: string } => {
  const parts = field.split('.');
  if (parts.length === 1) return { alias: 'root', column: parts[0] };
  return {
    alias: 'root_' + parts.slice(0, -1).join('_'),
    column: parts[parts.length - 1],
  };
};

// ---------------------------------------------------------------------------
// encodeCursor / decodeCursor
// ---------------------------------------------------------------------------
describe('encodeCursor / decodeCursor', () => {
  it('round-trips a cursor with string values', () => {
    const values: CursorValues = { createdAt: '2024-01-15', id: '5' };
    expect(decodeCursor(encodeCursor(values))).toEqual(values);
  });

  it('round-trips a cursor with numeric values', () => {
    const values: CursorValues = { age: 30, score: 99.5 };
    expect(decodeCursor(encodeCursor(values))).toEqual(values);
  });

  it('round-trips a cursor with null values', () => {
    const values: CursorValues = { deletedAt: null, id: '1' };
    expect(decodeCursor(encodeCursor(values))).toEqual(values);
  });

  it('produces a URL-safe base64url string (no +, /, =)', () => {
    const encoded = encodeCursor({ createdAt: '2024-01-15T12:00:00Z', id: '123' });
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('throws on a completely invalid cursor string', () => {
    expect(() => decodeCursor('!@#$%^&*()')).toThrow('Invalid cursor: failed to decode');
  });

  it('throws when cursor decodes to non-JSON', () => {
    const nonJson = Buffer.from('this is not json').toString('base64url');
    expect(() => decodeCursor(nonJson)).toThrow('Invalid cursor: failed to decode');
  });

  it('throws when cursor decodes to a JSON array (not an object)', () => {
    const array = Buffer.from('[1, 2, 3]').toString('base64url');
    expect(() => decodeCursor(array)).toThrow('Invalid cursor: failed to decode');
  });
});

// ---------------------------------------------------------------------------
// getEffectiveSortFields
// ---------------------------------------------------------------------------
describe('getEffectiveSortFields', () => {
  it('appends id ASC tiebreaker when id is absent', () => {
    const sort: SortField[] = [{ field: 'createdAt', dir: 'DESC' }];
    expect(getEffectiveSortFields(sort)).toEqual([
      { field: 'createdAt', dir: 'DESC' },
      { field: 'id', dir: 'ASC' },
    ]);
  });

  it('does not add tiebreaker when id field is already present', () => {
    const sort: SortField[] = [{ field: 'id', dir: 'ASC' }];
    expect(getEffectiveSortFields(sort)).toHaveLength(1);
  });

  it('does not add tiebreaker when a nested .id field is present (e.g. doctor.id)', () => {
    const sort: SortField[] = [{ field: 'doctor.id', dir: 'DESC' }];
    expect(getEffectiveSortFields(sort)).toHaveLength(1);
  });

  it('returns [id ASC] when sort array is empty', () => {
    expect(getEffectiveSortFields([])).toEqual([{ field: 'id', dir: 'ASC' }]);
  });

  it('preserves original sort order before injected id', () => {
    const sort: SortField[] = [
      { field: 'lastName', dir: 'ASC' },
      { field: 'firstName', dir: 'ASC' },
    ];
    const result = getEffectiveSortFields(sort);
    expect(result[0].field).toBe('lastName');
    expect(result[1].field).toBe('firstName');
    expect(result[2]).toEqual({ field: 'id', dir: 'ASC' });
  });
});

// ---------------------------------------------------------------------------
// buildCursorWhereClause
// ---------------------------------------------------------------------------
describe('buildCursorWhereClause', () => {
  it('builds a single DESC column cursor WHERE', () => {
    const sortFields: SortField[] = [{ field: 'createdAt', dir: 'DESC' }];
    const cursorValues: CursorValues = { createdAt: '2024-01-15' };
    const { sql, params } = buildCursorWhereClause(sortFields, cursorValues, resolver);

    expect(sql).toBe('root.createdAt < :cur_0');
    expect(params).toEqual({ cur_0: '2024-01-15' });
  });

  it('builds a single ASC column cursor WHERE', () => {
    const sortFields: SortField[] = [{ field: 'id', dir: 'ASC' }];
    const cursorValues: CursorValues = { id: '5' };
    const { sql, params } = buildCursorWhereClause(sortFields, cursorValues, resolver);

    expect(sql).toBe('root.id > :cur_0');
    expect(params).toEqual({ cur_0: '5' });
  });

  it('builds multi-column mixed-direction cursor WHERE (DESC + ASC)', () => {
    const sortFields: SortField[] = [
      { field: 'createdAt', dir: 'DESC' },
      { field: 'id', dir: 'ASC' },
    ];
    const cursorValues: CursorValues = { createdAt: '2024-01-15', id: '5' };
    const { sql, params } = buildCursorWhereClause(sortFields, cursorValues, resolver);

    // First clause: descending column alone
    expect(sql).toContain('root.createdAt < :cur_0');
    // Second clause: equality on first + ascending on second
    expect(sql).toContain('root.createdAt = :cur_0_eq');
    expect(sql).toContain('root.id > :cur_1');
    expect(params).toEqual({
      cur_0: '2024-01-15',
      cur_0_eq: '2024-01-15',
      cur_1: '5',
    });
  });

  it('builds three-column cursor WHERE', () => {
    const sortFields: SortField[] = [
      { field: 'lastName', dir: 'ASC' },
      { field: 'firstName', dir: 'ASC' },
      { field: 'id', dir: 'ASC' },
    ];
    const cursorValues: CursorValues = { lastName: 'Smith', firstName: 'John', id: '7' };
    const { sql, params } = buildCursorWhereClause(sortFields, cursorValues, resolver);

    expect(sql).toContain('root.lastName > :cur_0');
    expect(sql).toContain('root.lastName = :cur_0_eq');
    expect(sql).toContain('root.firstName > :cur_1');
    expect(sql).toContain('root.firstName = :cur_1_eq');
    expect(sql).toContain('root.id > :cur_2');
    expect(params.cur_0).toBe('Smith');
    expect(params.cur_1).toBe('John');
    expect(params.cur_2).toBe('7');
  });

  it('resolves nested relation fields to correct alias and column', () => {
    const sortFields: SortField[] = [{ field: 'doctor.name', dir: 'ASC' }];
    const cursorValues: CursorValues = { 'doctor.name': 'Smith' };
    const { sql, params } = buildCursorWhereClause(sortFields, cursorValues, resolver);

    expect(sql).toBe('root_doctor.name > :cur_0');
    expect(params).toEqual({ cur_0: 'Smith' });
  });

  it('handles null cursor value with IS NOT NULL fallback', () => {
    const sortFields: SortField[] = [{ field: 'deletedAt', dir: 'DESC' }];
    const cursorValues: CursorValues = { deletedAt: null };
    const { sql, params } = buildCursorWhereClause(sortFields, cursorValues, resolver);

    expect(sql).toContain('IS NOT NULL');
    expect(Object.keys(params)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// extractCursorValues
// ---------------------------------------------------------------------------
describe('extractCursorValues', () => {
  it('extracts root-level fields from a row', () => {
    const row = { id: '1', createdAt: '2024-01-01', name: 'Alice' };
    const sortFields: SortField[] = [
      { field: 'createdAt', dir: 'DESC' },
      { field: 'id', dir: 'ASC' },
    ];
    expect(extractCursorValues(row as Record<string, unknown>, sortFields)).toEqual({
      createdAt: '2024-01-01',
      id: '1',
    });
  });

  it('extracts nested relation fields from a row', () => {
    const row = { id: '1', doctor: { name: 'Smith', department: { id: '42' } } };
    const sortFields: SortField[] = [
      { field: 'doctor.name', dir: 'ASC' },
      { field: 'doctor.department.id', dir: 'ASC' },
    ];
    expect(extractCursorValues(row as Record<string, unknown>, sortFields)).toEqual({
      'doctor.name': 'Smith',
      'doctor.department.id': '42',
    });
  });

  it('returns null for missing nested paths', () => {
    const row = { id: '1' };
    const sortFields: SortField[] = [{ field: 'doctor.name', dir: 'ASC' }];
    const result = extractCursorValues(row as Record<string, unknown>, sortFields);
    expect(result['doctor.name']).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildCursorPage
// ---------------------------------------------------------------------------
describe('buildCursorPage', () => {
  const sortFields: SortField[] = [
    { field: 'createdAt', dir: 'DESC' },
    { field: 'id', dir: 'ASC' },
  ];

  const makeRows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: String(i + 1),
      createdAt: `2024-01-${String(i + 1).padStart(2, '0')}`,
    }));

  it('detects hasMore=true when rows.length > limit and trims data', () => {
    const rows = makeRows(11);
    const page = buildCursorPage(rows as Record<string, unknown>[], 10, sortFields);

    expect(page.meta.hasMore).toBe(true);
    expect(page.data).toHaveLength(10);
    expect(page.meta.nextCursor).not.toBeNull();
  });

  it('detects hasMore=false when rows.length <= limit', () => {
    const rows = makeRows(5);
    const page = buildCursorPage(rows as Record<string, unknown>[], 10, sortFields);

    expect(page.meta.hasMore).toBe(false);
    expect(page.data).toHaveLength(5);
    expect(page.meta.nextCursor).toBeNull();
  });

  it('encodes nextCursor from the last data row (not the extra row)', () => {
    // 2 rows with limit 1 → hasMore, nextCursor is from row[0]
    const rows = [
      { id: '1', createdAt: '2024-01-10' },
      { id: '2', createdAt: '2024-01-09' },
    ];
    const page = buildCursorPage(rows as Record<string, unknown>[], 1, sortFields);

    expect(page.meta.hasMore).toBe(true);
    expect(page.data).toHaveLength(1);

    const decoded = decodeCursor(page.meta.nextCursor!);
    expect(decoded).toEqual({ createdAt: '2024-01-10', id: '1' });
  });

  it('passes through prevCursor unchanged', () => {
    const rows = makeRows(3);
    const prev = encodeCursor({ createdAt: '2024-01-06', id: '4' });
    const page = buildCursorPage(rows as Record<string, unknown>[], 10, sortFields, prev);

    expect(page.meta.prevCursor).toBe(prev);
  });

  it('defaults prevCursor to null when not provided', () => {
    const rows = makeRows(1);
    const page = buildCursorPage(rows as Record<string, unknown>[], 10, sortFields);

    expect(page.meta.prevCursor).toBeNull();
  });

  it('includes total in meta when provided', () => {
    const rows = makeRows(1);
    const page = buildCursorPage(rows as Record<string, unknown>[], 10, sortFields, null, 42);

    expect(page.meta.totalRecords).toBe(42);
  });

  it('omits total from meta when not provided', () => {
    const rows = makeRows(1);
    const page = buildCursorPage(rows as Record<string, unknown>[], 10, sortFields);

    expect('totalRecords' in page.meta).toBe(false);
  });

  it('sets limit in meta correctly', () => {
    const rows = makeRows(3);
    const page = buildCursorPage(rows as Record<string, unknown>[], 20, sortFields);

    expect(page.meta.limit).toBe(20);
  });

  it('returns empty data with no nextCursor on empty result', () => {
    const page = buildCursorPage([], 10, sortFields);

    expect(page.data).toHaveLength(0);
    expect(page.meta.hasMore).toBe(false);
    expect(page.meta.nextCursor).toBeNull();
  });
});
