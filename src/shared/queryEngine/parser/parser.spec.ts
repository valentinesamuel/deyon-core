import { describe, it, expect } from 'vitest';
import { parseWhereClause } from './parser';
import { ParseError } from './parser';
import { tokenize, LexerError } from '../lexer/lexer';
import { ConditionNode, LogicalNode, AggregateConditionNode } from '../types/ast.types';

describe('Lexer', () => {
  it('tokenizes a simple equality', () => {
    const tokens = tokenize('a=1');
    expect(tokens[0]).toMatchObject({ type: 'IDENT', value: 'a' });
    expect(tokens[1]).toMatchObject({ type: 'OP', value: '=' });
    expect(tokens[2]).toMatchObject({ type: 'VALUE', value: '1' });
    expect(tokens[3]).toMatchObject({ type: 'EOF' });
  });

  it('tokenizes AND and OR keywords', () => {
    const tokens = tokenize('a=1 AND b=2 OR c=3');
    const types = tokens.map((t) => t.type);
    expect(types).toEqual([
      'IDENT',
      'OP',
      'VALUE',
      'AND',
      'IDENT',
      'OP',
      'VALUE',
      'OR',
      'IDENT',
      'OP',
      'VALUE',
      'EOF',
    ]);
  });

  it('tokenizes parentheses', () => {
    const tokens = tokenize('(a=1)');
    expect(tokens[0]).toMatchObject({ type: 'LPAREN' });
    expect(tokens[4]).toMatchObject({ type: 'RPAREN' });
  });

  it('tokenizes IS NULL and IS NOT NULL', () => {
    const t1 = tokenize('a IS NULL');
    expect(t1[1]).toMatchObject({ type: 'OP', value: 'IS NULL' });

    const t2 = tokenize('a IS NOT NULL');
    expect(t2[1]).toMatchObject({ type: 'OP', value: 'IS NOT NULL' });
  });

  it('tokenizes IN operator', () => {
    const tokens = tokenize("status IN ('a','b')");
    expect(tokens[1]).toMatchObject({ type: 'OP', value: 'IN' });
  });

  it('tokenizes string values with escapes', () => {
    const tokens = tokenize("name='it\\'s'");
    expect(tokens[2]).toMatchObject({ type: 'VALUE', value: "it's" });
  });

  it('throws LexerError on unterminated string', () => {
    expect(() => tokenize("name='unclosed")).toThrow(LexerError);
  });

  it('throws LexerError on unexpected character', () => {
    expect(() => tokenize('a # b')).toThrow(LexerError);
  });
});

describe('Parser', () => {
  it('returns null for empty input', () => {
    expect(parseWhereClause('')).toBeNull();
    expect(parseWhereClause('   ')).toBeNull();
  });

  it('parses a simple equality: a=1', () => {
    const ast = parseWhereClause('a=1') as ConditionNode;
    expect(ast).toMatchObject({ type: 'CONDITION', field: 'a', op: 'eq', value: 1 });
  });

  it('parses AND expression: a=1 AND b=2', () => {
    const ast = parseWhereClause('a=1 AND b=2') as LogicalNode;
    expect(ast.type).toBe('AND');
    expect(ast.children).toHaveLength(2);
    expect(ast.children[0]).toMatchObject({ field: 'a', op: 'eq', value: 1 });
    expect(ast.children[1]).toMatchObject({ field: 'b', op: 'eq', value: 2 });
  });

  it('parses OR expression: a=1 OR b=2', () => {
    const ast = parseWhereClause('a=1 OR b=2') as LogicalNode;
    expect(ast.type).toBe('OR');
    expect(ast.children).toHaveLength(2);
  });

  it('parses grouped expression: (a=1 AND b=2) OR c=3', () => {
    const ast = parseWhereClause('(a=1 AND b=2) OR c=3') as LogicalNode;
    expect(ast.type).toBe('OR');
    expect(ast.children[0]).toMatchObject({ type: 'AND' });
    expect((ast.children[0] as LogicalNode).children).toHaveLength(2);
    expect(ast.children[1]).toMatchObject({ type: 'CONDITION', field: 'c', op: 'eq', value: 3 });
  });

  it('parses nested relation field: doctor.department.name', () => {
    const ast = parseWhereClause("doctor.department.name='radiology'") as ConditionNode;
    expect(ast).toMatchObject({
      type: 'CONDITION',
      field: 'doctor.department.name',
      op: 'eq',
      value: 'radiology',
    });
  });

  it('parses IN list: status IN (active,pending)', () => {
    const ast = parseWhereClause("status IN ('active','pending')") as ConditionNode;
    expect(ast).toMatchObject({
      type: 'CONDITION',
      field: 'status',
      op: 'in',
      value: ['active', 'pending'],
    });
  });

  it('parses NOT IN list', () => {
    const ast = parseWhereClause("status NOT IN ('deleted','archived')") as ConditionNode;
    expect(ast).toMatchObject({ type: 'CONDITION', op: 'nin' });
  });

  it('parses IS NULL', () => {
    const ast = parseWhereClause('deletedAt IS NULL') as ConditionNode;
    expect(ast).toMatchObject({ type: 'CONDITION', field: 'deletedAt', op: 'isNull', value: null });
  });

  it('parses IS NOT NULL', () => {
    const ast = parseWhereClause('deletedAt IS NOT NULL') as ConditionNode;
    expect(ast).toMatchObject({
      type: 'CONDITION',
      field: 'deletedAt',
      op: 'notNull',
      value: null,
    });
  });

  it('parses BETWEEN operator', () => {
    const ast = parseWhereClause('age BETWEEN 18 AND 65') as ConditionNode;
    expect(ast).toMatchObject({
      type: 'CONDITION',
      field: 'age',
      op: 'between',
      value: ['18', '65'],
    });
  });

  it('parses ILIKE operator', () => {
    const ast = parseWhereClause("name ILIKE '%john%'") as ConditionNode;
    expect(ast).toMatchObject({ type: 'CONDITION', field: 'name', op: 'ilike', value: '%john%' });
  });

  it('parses gte, lte, ne operators', () => {
    expect(parseWhereClause('age>=18')).toMatchObject({ op: 'gte', value: 18 });
    expect(parseWhereClause('age<=65')).toMatchObject({ op: 'lte', value: 65 });
    expect(parseWhereClause('age!=0')).toMatchObject({ op: 'ne', value: 0 });
  });

  it('parses aggregate condition: count(appointments)>5', () => {
    const ast = parseWhereClause('count(appointments)>5') as AggregateConditionNode;
    expect(ast).toMatchObject({
      type: 'AGGREGATE',
      fn: 'count',
      field: 'appointments',
      op: 'gt',
      value: 5,
    });
  });

  it('parses deep nested groups', () => {
    const ast = parseWhereClause('((a=1 AND b=2) OR c=3) AND d=4') as LogicalNode;
    expect(ast.type).toBe('AND');
    expect(ast.children[0]).toMatchObject({ type: 'OR' });
  });

  it('throws ParseError on malformed input: missing closing paren', () => {
    expect(() => parseWhereClause('(a=1')).toThrow(ParseError);
  });

  it('throws ParseError on missing value', () => {
    expect(() => parseWhereClause('a=')).toThrow(ParseError);
  });

  it('throws ParseError on missing operator', () => {
    expect(() => parseWhereClause('a b')).toThrow(ParseError);
  });
});
