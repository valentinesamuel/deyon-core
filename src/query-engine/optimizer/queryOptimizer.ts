import { ASTNode, ASTNodeType, ConditionNode, LogicalNode } from '../types/ast.types';
import { ParsedQuery } from '../types/query.types';
import { ModelQueryConfig, MODEL_QUERY_CONFIG_DEFAULTS } from '../types/modelConfig.types';
import { JoinSpec } from '../planner/joinPlanner';
import { FilterPlan } from '../planner/filterPlanner';
import { scoreComplexity } from '../validation/complexityScorer';
import { QueryTooComplexError } from '../validation/queryValidator';

/**
 * Selectivity scores for operators — lower = more selective (runs first in AND chains).
 * eq is most selective (1), ilike is least selective (10).
 */
const SELECTIVITY_SCORES: Record<string, number> = {
  eq: 1,
  ne: 2,
  isNull: 3,
  notNull: 4,
  in: 5,
  nin: 6,
  gt: 7,
  gte: 7,
  lt: 7,
  lte: 7,
  between: 8,
  like: 9,
  ilike: 10,
};

/**
 * Input to the optimizer — assembled after parsing and planning.
 */
export interface QueryPlan {
  parsedQuery: ParsedQuery;
  joinSpecs: JoinSpec[];
  filterPlan: FilterPlan;
  /**
   * Aliases that appear in SELECT (via fields= or include=).
   * Joins NOT in this set are filter-only and are EXISTS candidates.
   */
  selectedAliases: Set<string>;
  config: ModelQueryConfig;
}

/**
 * A JoinSpec annotated by the optimizer.
 */
export interface OptimizedJoinSpec extends JoinSpec {
  /**
   * If true, this join is used only for filtering — no columns are selected from it.
   * The query builder should replace this LEFT JOIN with an EXISTS subquery when possible.
   */
  useExists: boolean;
  /**
   * Raw SQL snippets to append to the JOIN ON clause (predicate pushdown).
   * These are conditions that exclusively reference this alias and can be safely
   * moved from the root WHERE clause to the JOIN ON, improving selectivity on the join.
   *
   * Example: ["root_doctor.status = 'active'"]
   */
  pushdownConditions: string[];
}

/**
 * Output of the optimizer.
 */
export interface OptimizedPlan {
  parsedQuery: ParsedQuery; // whereAst may be reordered for selectivity
  joinSpecs: OptimizedJoinSpec[];
}

/**
 * Pure optimizer function: `optimize(plan) → OptimizedPlan`.
 *
 * Steps applied in order:
 * 1. Reorder AND-node children by selectivity (eq first, ilike last).
 * 2. Detect filter-only joins as EXISTS candidates.
 * 3. Identify predicate pushdown candidates (simple single-alias conditions).
 * 4. Final cost gate — throws QueryTooComplexError if score > maxComplexityScore.
 */
export function optimize(plan: QueryPlan): OptimizedPlan {
  // 1. Reorder AST by selectivity — purely structural, no side effects
  const optimizedAst = reorderBySelectivity(plan.parsedQuery.whereAst);

  // 2. Detect filter-only aliases (EXISTS candidates)
  const filterOnlyAliases = detectFilterOnlyAliases(
    plan.joinSpecs,
    plan.filterPlan,
    plan.selectedAliases,
  );

  // 3. Build pushdown map: alias → raw SQL condition strings
  const pushdownMap = buildPushdownMap(plan.filterPlan, optimizedAst);

  // 4. Annotate join specs
  const optimizedJoins: OptimizedJoinSpec[] = plan.joinSpecs.map((spec) => ({
    ...spec,
    useExists: filterOnlyAliases.has(spec.alias),
    pushdownConditions: pushdownMap.get(spec.alias) ?? [],
  }));

  // 5. Final cost gate — re-run against current parsedQuery
  const maxScore = plan.config.maxComplexityScore ?? MODEL_QUERY_CONFIG_DEFAULTS.maxComplexityScore;
  const breakdown = scoreComplexity(plan.parsedQuery);
  if (breakdown.total > maxScore) {
    throw new QueryTooComplexError(breakdown.total, maxScore);
  }

  return {
    parsedQuery: {
      ...plan.parsedQuery,
      whereAst: optimizedAst,
    },
    joinSpecs: optimizedJoins,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Recursively reorder AND-node children by selectivity score (ascending).
 * OR-nodes are left structurally unchanged but their children are recursed.
 * Leaf nodes (CONDITION, AGGREGATE) are returned unchanged.
 */
export function reorderBySelectivity(node: ASTNode | null): ASTNode | null {
  if (!node) return null;

  if (node.type === ASTNodeType.OR) {
    return {
      ...node,
      children: node.children.map((c) => reorderBySelectivity(c)!),
    } as LogicalNode;
  }

  if (node.type === ASTNodeType.AND) {
    const reordered = node.children
      .map((c) => reorderBySelectivity(c)!)
      .sort((a, b) => getNodeSelectivityScore(a) - getNodeSelectivityScore(b));
    return { ...node, children: reordered } as LogicalNode;
  }

  // CONDITION or AGGREGATE — leaf node
  return node;
}

/**
 * Return the selectivity score for an AST node.
 * Lower = more selective = should appear earlier in AND chains.
 * For logical nodes, use the minimum score of their children.
 */
export function getNodeSelectivityScore(node: ASTNode): number {
  if (node.type === ASTNodeType.CONDITION) {
    return SELECTIVITY_SCORES[node.op] ?? 5;
  }
  if (node.type === ASTNodeType.AGGREGATE) {
    return SELECTIVITY_SCORES[node.op] ?? 5;
  }
  // Logical node — delegate to minimum child score
  if (node.children.length === 0) return 999;
  return Math.min(...node.children.map(getNodeSelectivityScore));
}

/**
 * Identify join aliases that are used ONLY for filtering (no column selection).
 * These are candidates for EXISTS subquery replacement.
 *
 * An alias is filter-only when:
 * - It appears in at least one resolved filter condition, AND
 * - It does NOT appear in selectedAliases (no columns are fetched from it)
 */
export function detectFilterOnlyAliases(
  joinSpecs: JoinSpec[],
  filterPlan: FilterPlan,
  selectedAliases: Set<string>,
): Set<string> {
  const filterAliases = new Set<string>();
  for (const [, resolved] of filterPlan.resolvedConditions) {
    if (resolved.alias !== 'root') {
      filterAliases.add(resolved.alias);
    }
  }

  const filterOnly = new Set<string>();
  for (const spec of joinSpecs) {
    if (filterAliases.has(spec.alias) && !selectedAliases.has(spec.alias)) {
      filterOnly.add(spec.alias);
    }
  }
  return filterOnly;
}

/**
 * Build a map of alias → pushdown SQL snippets.
 *
 * A condition is a pushdown candidate when it is a top-level CONDITION node
 * (direct child of the root AND, or the root itself) that references exactly
 * one non-root alias. Such conditions can be safely moved from the WHERE clause
 * to the JOIN ON condition of the referenced alias.
 *
 * NOTE: This returns metadata only — the query builder is responsible for
 * actually emitting the conditions in the JOIN ON vs. WHERE clause.
 */
function buildPushdownMap(filterPlan: FilterPlan, ast: ASTNode | null): Map<string, string[]> {
  const result = new Map<string, string[]>();
  if (!ast) return result;

  // Collect top-level CONDITION candidates
  const candidates: ConditionNode[] = [];
  if (ast.type === ASTNodeType.AND) {
    for (const child of ast.children) {
      if (child.type === ASTNodeType.CONDITION) candidates.push(child);
    }
  } else if (ast.type === ASTNodeType.CONDITION) {
    candidates.push(ast);
  }

  for (const cond of candidates) {
    const resolved = filterPlan.resolvedConditions.get(cond);
    if (!resolved || resolved.alias === 'root') continue;

    // Build a human-readable SQL snippet for the pushdown
    const snippet = formatConditionSnippet(resolved.alias, resolved.column, cond);
    if (!result.has(resolved.alias)) {
      result.set(resolved.alias, []);
    }
    result.get(resolved.alias)!.push(snippet);
  }

  return result;
}

/**
 * Format a condition as a SQL snippet string for pushdown annotation.
 * Uses parameterized-style values for readability (not actual execution).
 */
function formatConditionSnippet(alias: string, column: string, node: ConditionNode): string {
  const col = `${alias}.${column}`;
  switch (node.op) {
    case 'eq':
      return `${col} = ${JSON.stringify(node.value)}`;
    case 'ne':
      return `${col} != ${JSON.stringify(node.value)}`;
    case 'gt':
      return `${col} > ${node.value}`;
    case 'gte':
      return `${col} >= ${node.value}`;
    case 'lt':
      return `${col} < ${node.value}`;
    case 'lte':
      return `${col} <= ${node.value}`;
    case 'in':
      return `${col} IN (${Array.isArray(node.value) ? (node.value as string[]).map((v) => JSON.stringify(v)).join(', ') : JSON.stringify(node.value)})`;
    case 'nin':
      return `${col} NOT IN (${Array.isArray(node.value) ? (node.value as string[]).map((v) => JSON.stringify(v)).join(', ') : JSON.stringify(node.value)})`;
    case 'isNull':
      return `${col} IS NULL`;
    case 'notNull':
      return `${col} IS NOT NULL`;
    case 'like':
      return `${col} LIKE ${JSON.stringify(node.value)}`;
    case 'ilike':
      return `${col} ILIKE ${JSON.stringify(node.value)}`;
    case 'between':
      return Array.isArray(node.value)
        ? `${col} BETWEEN ${JSON.stringify(node.value[0])} AND ${JSON.stringify(node.value[1])}`
        : `${col} BETWEEN ${JSON.stringify(node.value)} AND ${JSON.stringify(node.value)}`;
    default:
      return `${col} /* op:${node.op} */`;
  }
}
