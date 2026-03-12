import { ASTNode, ASTNodeType } from '../types/ast.types';
import { ParsedQuery } from '../types/query.types';

export interface ComplexityBreakdown {
  filters: number;
  joins: number;
  search: number;
  aggregations: number;
  total: number;
}

/**
 * Cost weights per operation type.
 */
const COSTS = {
  filter: 1,
  join: 3,
  search: 5,
  aggregation: 6,
} as const;

/**
 * Count leaf CONDITION/AGGREGATE nodes in an AST.
 */
function countAstConditions(node: ASTNode | null): number {
  if (!node) return 0;
  if (node.type === ASTNodeType.AND || node.type === ASTNodeType.OR) {
    return node.children.reduce((sum, child) => sum + countAstConditions(child), 0);
  }
  return 1;
}

/**
 * Extract unique relation prefixes from an AST (each unique prefix = one join).
 * e.g. field "doctor.department.name" contributes prefixes: "doctor", "doctor.department"
 */
function collectRelationPrefixes(node: ASTNode | null, prefixes: Set<string>): void {
  if (!node) return;
  if (node.type === ASTNodeType.AND || node.type === ASTNodeType.OR) {
    for (const child of node.children) {
      collectRelationPrefixes(child, prefixes);
    }
    return;
  }
  if (node.type === ASTNodeType.CONDITION || node.type === ASTNodeType.AGGREGATE) {
    const parts = node.field.split('.');
    // Build incremental prefixes for all but the last segment (which is the column)
    for (let i = 1; i < parts.length; i++) {
      prefixes.add(parts.slice(0, i).join('.'));
    }
  }
}

/**
 * Compute the complexity score for a parsed query.
 * - filter: 1 per AST leaf condition (where + having)
 * - join: 3 per unique relation path prefix
 * - search: 5 per search term
 * - aggregation: 6 if any aggregates or groupBy present
 */
export function scoreComplexity(query: ParsedQuery): ComplexityBreakdown {
  const filterCount = countAstConditions(query.whereAst) + countAstConditions(query.havingAst);

  const relationPrefixes = new Set<string>();
  collectRelationPrefixes(query.whereAst, relationPrefixes);
  collectRelationPrefixes(query.havingAst, relationPrefixes);
  // include= also forces joins
  for (const rel of query.include) {
    const parts = rel.split('.');
    for (let i = 1; i <= parts.length; i++) {
      relationPrefixes.add(parts.slice(0, i).join('.'));
    }
  }
  // groupBy relations
  for (const gb of query.groupBy) {
    const parts = gb.split('.');
    for (let i = 1; i < parts.length; i++) {
      relationPrefixes.add(parts.slice(0, i).join('.'));
    }
  }
  const joinCount = relationPrefixes.size;

  const searchCount = query.search.length;

  const aggregationCount = query.aggregates.length + query.groupBy.length > 0 ? 1 : 0;

  const filters = filterCount * COSTS.filter;
  const joins = joinCount * COSTS.join;
  const search = searchCount * COSTS.search;
  const aggregations = aggregationCount * COSTS.aggregation;
  const total = filters + joins + search + aggregations;

  return { filters, joins, search, aggregations, total };
}
