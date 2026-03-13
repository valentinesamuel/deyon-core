import { describe, it, expect } from 'vitest';
import { parseBracketFilter, mergeAsts, BracketParseError } from './bracketParser';
import { ConditionNode, LogicalNode } from '../types/ast.types';
import { parseWhereClause } from './parser';

describe('BracketParser', () => {
  it('returns null for empty filter object', () => {
    expect(parseBracketFilter({})).toBeNull();
  });

  it('parses a single eq filter', () => {
    const ast = parseBracketFilter({ status: { eq: 'active' } }) as ConditionNode;
    expect(ast).toMatchObject({ type: 'CONDITION', field: 'status', op: 'eq', value: 'active' });
  });

  it('parses numeric value', () => {
    const ast = parseBracketFilter({ age: { gte: '18' } }) as ConditionNode;
    expect(ast).toMatchObject({ type: 'CONDITION', field: 'age', op: 'gte', value: 18 });
  });

  it('parses multiple fields as AND node', () => {
    const ast = parseBracketFilter({
      status: { eq: 'active' },
      age: { gte: '18' },
    }) as LogicalNode;
    expect(ast.type).toBe('AND');
    expect(ast.children).toHaveLength(2);
  });

  it('parses IN operator with comma-separated values', () => {
    const ast = parseBracketFilter({ role: { in: 'admin,nurse' } }) as ConditionNode;
    expect(ast).toMatchObject({ type: 'CONDITION', op: 'in', value: ['admin', 'nurse'] });
  });

  it('parses isNull operator', () => {
    const ast = parseBracketFilter({ deletedAt: { isNull: '' } }) as ConditionNode;
    expect(ast).toMatchObject({ type: 'CONDITION', op: 'isNull', value: null });
  });

  it('parses notNull operator', () => {
    const ast = parseBracketFilter({ email: { notNull: '' } }) as ConditionNode;
    expect(ast).toMatchObject({ type: 'CONDITION', op: 'notNull', value: null });
  });

  it('parses between operator', () => {
    const ast = parseBracketFilter({ age: { between: '18,65' } }) as ConditionNode;
    expect(ast).toMatchObject({ type: 'CONDITION', op: 'between', value: ['18', '65'] });
  });

  it('throws BracketParseError for unknown operator', () => {
    expect(() => parseBracketFilter({ age: { badop: '5' } })).toThrow(BracketParseError);
  });

  it('parses dotted field path', () => {
    const ast = parseBracketFilter({ 'doctor.department.id': { eq: 'abc-123' } }) as ConditionNode;
    expect(ast).toMatchObject({ field: 'doctor.department.id', op: 'eq', value: 'abc-123' });
  });

  it('coerces "false" string to boolean false', () => {
    const ast = parseBracketFilter({ isActive: { eq: 'false' } }) as ConditionNode;
    expect(ast).toMatchObject({ type: 'CONDITION', field: 'isActive', op: 'eq', value: false });
    expect(typeof ast.value).toBe('boolean');
  });

  it('coerces "true" string to boolean true', () => {
    const ast = parseBracketFilter({ isApproved: { eq: 'true' } }) as ConditionNode;
    expect(ast).toMatchObject({ type: 'CONDITION', field: 'isApproved', op: 'eq', value: true });
    expect(typeof ast.value).toBe('boolean');
  });

  it('does not coerce UUID strings', () => {
    const uuid = '6d531e9b-9462-4525-870d-064059300896';
    const ast = parseBracketFilter({ roleId: { eq: uuid } }) as ConditionNode;
    expect(ast).toMatchObject({ value: uuid });
    expect(typeof ast.value).toBe('string');
  });
});

describe('mergeAsts', () => {
  it('returns null when both are null', () => {
    expect(mergeAsts(null, null)).toBeNull();
  });

  it('returns dsl ast when bracket is null', () => {
    const dsl = parseWhereClause('a=1');
    expect(mergeAsts(dsl, null)).toBe(dsl);
  });

  it('returns bracket ast when dsl is null', () => {
    const bracket = parseBracketFilter({ b: { eq: '2' } });
    expect(mergeAsts(null, bracket)).toBe(bracket);
  });

  it('merges both into AND node', () => {
    const dsl = parseWhereClause('a=1');
    const bracket = parseBracketFilter({ b: { eq: '2' } });
    const merged = mergeAsts(dsl, bracket) as LogicalNode;
    expect(merged.type).toBe('AND');
    expect(merged.children).toHaveLength(2);
  });
});
