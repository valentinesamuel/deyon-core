import { describe, it, expect } from 'vitest';
import {
  optimize,
  reorderBySelectivity,
  getNodeSelectivityScore,
  detectFilterOnlyAliases,
  QueryPlan,
  OptimizedJoinSpec,
} from './queryOptimizer';
import { ASTNode, ASTNodeType, ConditionNode, LogicalNode } from '../types/ast.types';
import { JoinSpec } from '../planner/joinPlanner';
import { FilterPlan } from '../planner/filterPlanner';
import { ModelQueryConfig } from '../types/modelConfig.types';
import { ParsedQuery } from '../types/query.types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeCondition(
  field: string,
  op: ConditionNode['op'],
  value: ConditionNode['value'] = 'val',
): ConditionNode {
  return { type: ASTNodeType.CONDITION, field, op, value };
}

function makeAnd(...children: ASTNode[]): LogicalNode {
  return { type: ASTNodeType.AND, children };
}

function makeOr(...children: ASTNode[]): LogicalNode {
  return { type: ASTNodeType.OR, children };
}

function makeJoinSpec(alias: string, parentAlias = 'root', depth = 1): JoinSpec {
  return {
    type: 'LEFT',
    parentAlias,
    relationProperty: alias.replace('root_', ''),
    alias,
    depth,
    hasDeletedAt: false,
  };
}

function makeFilterPlan(
  entries: Array<[ConditionNode, { alias: string; column: string }]>,
): FilterPlan {
  return {
    resolvedConditions: new Map(entries),
  };
}

const baseConfig: ModelQueryConfig = {
  allowedFilters: ['status', 'name', 'role.name', 'doctor.department.name'],
  allowedSort: ['createdAt', 'id'],
  allowedSearch: [],
  allowedRelations: [],
  allowedFields: [],
  maxComplexityScore: 50,
};

const baseParsedQuery: ParsedQuery = {
  whereAst: null,
  havingAst: null,
  sort: [],
  limit: 20,
  cursor: null,
  search: [],
  groupBy: [],
  aggregates: [],
  include: [],
  fields: {},
  withDeleted: false,
};

// ---------------------------------------------------------------------------
// reorderBySelectivity
// ---------------------------------------------------------------------------

describe('reorderBySelectivity', () => {
  it('returns null for null input', () => {
    expect(reorderBySelectivity(null)).toBeNull();
  });

  it('returns leaf CONDITION nodes unchanged', () => {
    const node = makeCondition('status', 'eq', 'active');
    const result = reorderBySelectivity(node);
    expect(result).toEqual(node);
  });

  it('reorders AND children: eq before ilike', () => {
    const eq = makeCondition('name', 'eq', 'john');
    const ilike = makeCondition('notes', 'ilike', '%fever%');
    const and = makeAnd(ilike, eq); // ilike comes first

    const result = reorderBySelectivity(and) as LogicalNode;
    expect(result.type).toBe('AND');
    expect(result.children[0]).toEqual(eq); // eq should be first
    expect(result.children[1]).toEqual(ilike);
  });

  it('reorders AND children: eq > in > gte > like > ilike', () => {
    const ilike = makeCondition('a', 'ilike', '%x%');
    const like = makeCondition('b', 'like', '%x%');
    const gte = makeCondition('c', 'gte', 18);
    const inOp = makeCondition('d', 'in', ['a', 'b']);
    const eq = makeCondition('e', 'eq', 'active');

    const and = makeAnd(ilike, like, gte, inOp, eq);
    const result = reorderBySelectivity(and) as LogicalNode;

    const ops = result.children.map((c) => (c as ConditionNode).op);
    expect(ops).toEqual(['eq', 'in', 'gte', 'like', 'ilike']);
  });

  it('does NOT reorder OR children (preserves order)', () => {
    const ilike = makeCondition('a', 'ilike', '%x%');
    const eq = makeCondition('b', 'eq', 'val');
    const or = makeOr(ilike, eq);

    const result = reorderBySelectivity(or) as LogicalNode;
    expect(result.type).toBe('OR');
    // OR children are recursed but not sorted
    expect((result.children[0] as ConditionNode).op).toBe('ilike');
    expect((result.children[1] as ConditionNode).op).toBe('eq');
  });

  it('recursively reorders nested AND nodes', () => {
    const outer_ilike = makeCondition('outer', 'ilike', '%x%');
    const inner_eq = makeCondition('inner1', 'eq', 'a');
    const inner_ilike = makeCondition('inner2', 'ilike', '%b%');
    const innerAnd = makeAnd(inner_ilike, inner_eq);

    const and = makeAnd(outer_ilike, innerAnd);
    const result = reorderBySelectivity(and) as LogicalNode;

    // The inner AND should be first because its min score (eq=1) < outer ilike score (10)
    expect(result.children[0].type).toBe('AND');
    const innerResult = result.children[0] as LogicalNode;
    expect((innerResult.children[0] as ConditionNode).op).toBe('eq');
    expect((innerResult.children[1] as ConditionNode).op).toBe('ilike');
  });

  it('no-op for already-optimal AND ordering', () => {
    const eq = makeCondition('a', 'eq', 'val');
    const ilike = makeCondition('b', 'ilike', '%x%');
    const and = makeAnd(eq, ilike); // already optimal

    const result = reorderBySelectivity(and) as LogicalNode;
    expect((result.children[0] as ConditionNode).field).toBe('a');
    expect((result.children[1] as ConditionNode).field).toBe('b');
  });
});

// ---------------------------------------------------------------------------
// getNodeSelectivityScore
// ---------------------------------------------------------------------------

describe('getNodeSelectivityScore', () => {
  it('returns 1 for eq', () => {
    expect(getNodeSelectivityScore(makeCondition('f', 'eq'))).toBe(1);
  });

  it('returns 10 for ilike', () => {
    expect(getNodeSelectivityScore(makeCondition('f', 'ilike'))).toBe(10);
  });

  it('returns 9 for like', () => {
    expect(getNodeSelectivityScore(makeCondition('f', 'like'))).toBe(9);
  });

  it('returns 7 for gte/lte/gt/lt', () => {
    expect(getNodeSelectivityScore(makeCondition('f', 'gte'))).toBe(7);
    expect(getNodeSelectivityScore(makeCondition('f', 'lte'))).toBe(7);
  });

  it('returns minimum child score for AND node', () => {
    const and = makeAnd(makeCondition('a', 'ilike'), makeCondition('b', 'eq'));
    // min of 10 and 1 = 1
    expect(getNodeSelectivityScore(and)).toBe(1);
  });

  it('returns 999 for empty logical node', () => {
    const empty: LogicalNode = { type: ASTNodeType.AND, children: [] };
    expect(getNodeSelectivityScore(empty)).toBe(999);
  });
});

// ---------------------------------------------------------------------------
// detectFilterOnlyAliases
// ---------------------------------------------------------------------------

describe('detectFilterOnlyAliases', () => {
  it('marks alias as filter-only when used in filter but not in selectedAliases', () => {
    const roleCondition = makeCondition('role.name', 'eq', 'admin');
    const joinSpecs = [makeJoinSpec('root_role')];
    const filterPlan = makeFilterPlan([[roleCondition, { alias: 'root_role', column: 'name' }]]);
    const selectedAliases = new Set<string>(); // root_role not selected

    const result = detectFilterOnlyAliases(joinSpecs, filterPlan, selectedAliases);
    expect(result.has('root_role')).toBe(true);
  });

  it('does NOT mark alias as filter-only when it appears in selectedAliases', () => {
    const roleCondition = makeCondition('role.name', 'eq', 'admin');
    const joinSpecs = [makeJoinSpec('root_role')];
    const filterPlan = makeFilterPlan([[roleCondition, { alias: 'root_role', column: 'name' }]]);
    const selectedAliases = new Set(['root_role']); // explicitly selected

    const result = detectFilterOnlyAliases(joinSpecs, filterPlan, selectedAliases);
    expect(result.has('root_role')).toBe(false);
  });

  it('does NOT mark root alias conditions as filter-only', () => {
    const rootCondition = makeCondition('status', 'eq', 'active');
    const joinSpecs = [makeJoinSpec('root_role')];
    const filterPlan = makeFilterPlan([[rootCondition, { alias: 'root', column: 'status' }]]);
    const selectedAliases = new Set<string>();

    const result = detectFilterOnlyAliases(joinSpecs, filterPlan, selectedAliases);
    expect(result.size).toBe(0);
  });

  it('handles multiple joins — only marks unselected ones', () => {
    const roleCond = makeCondition('role.name', 'eq', 'admin');
    const deptCond = makeCondition('department.id', 'eq', '1');
    const joinSpecs = [makeJoinSpec('root_role'), makeJoinSpec('root_department')];
    const filterPlan = makeFilterPlan([
      [roleCond, { alias: 'root_role', column: 'name' }],
      [deptCond, { alias: 'root_department', column: 'id' }],
    ]);
    const selectedAliases = new Set(['root_department']); // only dept is selected

    const result = detectFilterOnlyAliases(joinSpecs, filterPlan, selectedAliases);
    expect(result.has('root_role')).toBe(true);
    expect(result.has('root_department')).toBe(false);
  });

  it('returns empty set when no joins used for filtering', () => {
    const joinSpecs = [makeJoinSpec('root_role')];
    const filterPlan = makeFilterPlan([]);
    const selectedAliases = new Set<string>();

    const result = detectFilterOnlyAliases(joinSpecs, filterPlan, selectedAliases);
    expect(result.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// optimize (full function)
// ---------------------------------------------------------------------------

describe('optimize', () => {
  it('returns reordered whereAst in optimized plan', () => {
    const ilike = makeCondition('name', 'ilike', '%john%');
    const eq = makeCondition('status', 'eq', 'active');
    const and = makeAnd(ilike, eq);

    const plan: QueryPlan = {
      parsedQuery: { ...baseParsedQuery, whereAst: and },
      joinSpecs: [],
      filterPlan: makeFilterPlan([]),
      selectedAliases: new Set(),
      config: { ...baseConfig },
    };

    const result = optimize(plan);
    const ast = result.parsedQuery.whereAst as LogicalNode;
    expect((ast.children[0] as ConditionNode).op).toBe('eq');
    expect((ast.children[1] as ConditionNode).op).toBe('ilike');
  });

  it('marks filter-only joins with useExists=true', () => {
    const roleCond = makeCondition('role.name', 'eq', 'admin');
    const joinSpec = makeJoinSpec('root_role');
    const filterPlan = makeFilterPlan([[roleCond, { alias: 'root_role', column: 'name' }]]);

    const plan: QueryPlan = {
      parsedQuery: { ...baseParsedQuery, whereAst: roleCond },
      joinSpecs: [joinSpec],
      filterPlan,
      selectedAliases: new Set(), // not selected
      config: { ...baseConfig },
    };

    const result = optimize(plan);
    const optimizedJoin = result.joinSpecs[0] as OptimizedJoinSpec;
    expect(optimizedJoin.useExists).toBe(true);
  });

  it('does NOT mark selected joins with useExists', () => {
    const roleCond = makeCondition('role.name', 'eq', 'admin');
    const joinSpec = makeJoinSpec('root_role');
    const filterPlan = makeFilterPlan([[roleCond, { alias: 'root_role', column: 'name' }]]);

    const plan: QueryPlan = {
      parsedQuery: { ...baseParsedQuery, whereAst: roleCond },
      joinSpecs: [joinSpec],
      filterPlan,
      selectedAliases: new Set(['root_role']), // explicitly selected
      config: { ...baseConfig },
    };

    const result = optimize(plan);
    const optimizedJoin = result.joinSpecs[0] as OptimizedJoinSpec;
    expect(optimizedJoin.useExists).toBe(false);
  });

  it('populates pushdownConditions for top-level AND conditions on joined aliases', () => {
    const roleCond = makeCondition('role.name', 'eq', 'admin');
    const and = makeAnd(roleCond);
    const joinSpec = makeJoinSpec('root_role');
    const filterPlan = makeFilterPlan([[roleCond, { alias: 'root_role', column: 'name' }]]);

    const plan: QueryPlan = {
      parsedQuery: { ...baseParsedQuery, whereAst: and },
      joinSpecs: [joinSpec],
      filterPlan,
      selectedAliases: new Set(),
      config: { ...baseConfig },
    };

    const result = optimize(plan);
    const optimizedJoin = result.joinSpecs[0] as OptimizedJoinSpec;
    expect(optimizedJoin.pushdownConditions).toHaveLength(1);
    expect(optimizedJoin.pushdownConditions[0]).toContain('root_role.name');
    expect(optimizedJoin.pushdownConditions[0]).toContain('"admin"');
  });

  it('does NOT push down root conditions to any join', () => {
    const rootCond = makeCondition('status', 'eq', 'active');
    const and = makeAnd(rootCond);
    const joinSpec = makeJoinSpec('root_role');
    const filterPlan = makeFilterPlan([[rootCond, { alias: 'root', column: 'status' }]]);

    const plan: QueryPlan = {
      parsedQuery: { ...baseParsedQuery, whereAst: and },
      joinSpecs: [joinSpec],
      filterPlan,
      selectedAliases: new Set(),
      config: { ...baseConfig },
    };

    const result = optimize(plan);
    const optimizedJoin = result.joinSpecs[0] as OptimizedJoinSpec;
    expect(optimizedJoin.pushdownConditions).toHaveLength(0);
  });

  it('is a no-op for an already-optimal plan', () => {
    const eq = makeCondition('status', 'eq', 'active');

    const plan: QueryPlan = {
      parsedQuery: { ...baseParsedQuery, whereAst: eq },
      joinSpecs: [],
      filterPlan: makeFilterPlan([]),
      selectedAliases: new Set(),
      config: { ...baseConfig },
    };

    const result = optimize(plan);
    expect(result.parsedQuery.whereAst).toEqual(eq);
    expect(result.joinSpecs).toHaveLength(0);
  });

  it('handles null whereAst without error', () => {
    const plan: QueryPlan = {
      parsedQuery: { ...baseParsedQuery, whereAst: null },
      joinSpecs: [],
      filterPlan: makeFilterPlan([]),
      selectedAliases: new Set(),
      config: { ...baseConfig },
    };

    const result = optimize(plan);
    expect(result.parsedQuery.whereAst).toBeNull();
  });

  it('throws QueryTooComplexError when plan exceeds maxComplexityScore', () => {
    // Build a query with complexity > 5 (very low max for testing)
    const conditions = Array.from({ length: 10 }, (_, i) =>
      makeCondition(`field${i}`, 'eq', 'val'),
    );
    const and = makeAnd(...conditions);

    const plan: QueryPlan = {
      parsedQuery: {
        ...baseParsedQuery,
        whereAst: and,
      },
      joinSpecs: [],
      filterPlan: makeFilterPlan([]),
      selectedAliases: new Set(),
      config: { ...baseConfig, maxComplexityScore: 5 }, // 10 filters × 1 = cost 10 > 5
    };

    expect(() => optimize(plan)).toThrow();
  });

  it('does not throw when plan is within maxComplexityScore', () => {
    const eq = makeCondition('status', 'eq', 'active');

    const plan: QueryPlan = {
      parsedQuery: { ...baseParsedQuery, whereAst: eq },
      joinSpecs: [],
      filterPlan: makeFilterPlan([]),
      selectedAliases: new Set(),
      config: { ...baseConfig, maxComplexityScore: 50 },
    };

    expect(() => optimize(plan)).not.toThrow();
  });

  it('preserves all original JoinSpec fields on optimized joins', () => {
    const joinSpec: JoinSpec = {
      type: 'LEFT',
      parentAlias: 'root',
      relationProperty: 'doctor',
      alias: 'root_doctor',
      depth: 1,
      hasDeletedAt: true,
    };

    const plan: QueryPlan = {
      parsedQuery: { ...baseParsedQuery },
      joinSpecs: [joinSpec],
      filterPlan: makeFilterPlan([]),
      selectedAliases: new Set(),
      config: { ...baseConfig },
    };

    const result = optimize(plan);
    const optimized = result.joinSpecs[0] as OptimizedJoinSpec;

    expect(optimized.type).toBe('LEFT');
    expect(optimized.parentAlias).toBe('root');
    expect(optimized.relationProperty).toBe('doctor');
    expect(optimized.alias).toBe('root_doctor');
    expect(optimized.depth).toBe(1);
    expect(optimized.hasDeletedAt).toBe(true);
  });
});
