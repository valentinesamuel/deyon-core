import { describe, it, expect } from 'vitest';
import { scoreComplexity } from './complexityScorer';
import { ParsedQuery } from '../types/query.types';
import { ASTNode, ASTNodeType, ConditionNode, LogicalNode } from '../types/ast.types';
import { parseWhereClause } from '../parser/parser';

function makeQuery(overrides: Partial<ParsedQuery> = {}): ParsedQuery {
  return {
    whereAst: null,
    havingAst: null,
    sort: [],
    limit: 10,
    cursor: null,
    search: [],
    groupBy: [],
    aggregates: [],
    include: [],
    fields: {},
    withDeleted: false,
    withTotal: false,
    ...overrides,
  };
}

describe('complexityScorer', () => {
  it('scores zero for an empty query', () => {
    const result = scoreComplexity(makeQuery());
    expect(result).toEqual({ filters: 0, joins: 0, search: 0, aggregations: 0, total: 0 });
  });

  it('scores filters correctly (1 per condition)', () => {
    const whereAst = parseWhereClause('a=1 AND b=2 AND c=3');
    const result = scoreComplexity(makeQuery({ whereAst }));
    expect(result.filters).toBe(3); // 3 conditions × 1
    expect(result.joins).toBe(0);
  });

  it('scores joins for relation fields (3 per unique prefix)', () => {
    const whereAst: ASTNode = {
      type: ASTNodeType.AND,
      children: [
        {
          type: ASTNodeType.CONDITION,
          field: 'doctor.name',
          op: 'eq',
          value: 'x',
        } as ConditionNode,
        {
          type: ASTNodeType.CONDITION,
          field: 'doctor.department.id',
          op: 'eq',
          value: 1,
        } as ConditionNode,
      ],
    } as LogicalNode;
    // Prefixes: "doctor", "doctor.department" → 2 unique joins × 3 = 6
    const result = scoreComplexity(makeQuery({ whereAst }));
    expect(result.joins).toBe(6);
  });

  it('deduplicates relation prefixes across where and having ASTs', () => {
    const whereAst = parseWhereClause('doctor.name=x');
    const havingAst: ASTNode = {
      type: ASTNodeType.AGGREGATE,
      fn: 'count',
      field: 'doctor',
      op: 'gt',
      value: 5,
    };
    // "doctor" prefix appears in both but counted once → 1 join × 3 = 3
    const result = scoreComplexity(makeQuery({ whereAst, havingAst }));
    expect(result.joins).toBe(3);
  });

  it('scores search terms (5 per search)', () => {
    const search = [
      { field: 'name', type: 'fts' as const, value: 'john' },
      { field: 'notes', type: 'tri' as const, value: 'fever' },
    ];
    const result = scoreComplexity(makeQuery({ search }));
    expect(result.search).toBe(10); // 2 × 5
  });

  it('scores aggregations as 6 when any groupBy or aggregate present', () => {
    const result = scoreComplexity(
      makeQuery({ groupBy: ['department.id'], aggregates: [{ fn: 'count', field: 'id' }] }),
    );
    expect(result.aggregations).toBe(6); // capped at 1 × 6 regardless of count
  });

  it('scores aggregations as 0 when none present', () => {
    const result = scoreComplexity(makeQuery());
    expect(result.aggregations).toBe(0);
  });

  it('includes include= relation paths in join count', () => {
    // include: ['doctor.department'] → prefixes: "doctor", "doctor.department" → 2 joins × 3 = 6
    const result = scoreComplexity(makeQuery({ include: ['doctor.department'] }));
    expect(result.joins).toBe(6);
  });

  it('computes total as sum of all components', () => {
    const whereAst = parseWhereClause('status=active AND doctor.name=x');
    // filters: 2 × 1 = 2, joins: "doctor" prefix × 3 = 3, search: 0, agg: 0 → total = 5
    const result = scoreComplexity(makeQuery({ whereAst }));
    expect(result.total).toBe(result.filters + result.joins + result.search + result.aggregations);
    expect(result.total).toBe(5);
  });
});
