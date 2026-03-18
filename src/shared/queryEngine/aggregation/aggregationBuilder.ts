import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { ASTNode, ASTNodeType, AggregateConditionNode, ConditionNode } from '../types/ast.types';
import { JoinPlanner } from '../planner/joinPlanner';

const AGG_FN_SQL: Record<string, string> = {
  count: 'COUNT',
  sum: 'SUM',
  avg: 'AVG',
  min: 'MIN',
  max: 'MAX',
};

const AGG_OP_SQL: Record<string, string> = {
  eq: '=',
  ne: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
};

/**
 * Applies GROUP BY, aggregate SELECTs, and HAVING clauses to a SelectQueryBuilder.
 *
 * - groupBy: registers joins via JoinPlanner, emits .groupBy() / .addGroupBy()
 * - aggregates: emits .addSelect('FN(alias.col)', 'fn_col')
 * - havingAst: walks the AST recursively, building raw SQL string for HAVING
 *
 * HAVING uses `.andHaving()` with a fully pre-built SQL expression so that
 * nested AND/OR logic is preserved in a single call.
 */
export class AggregationBuilder {
  private paramIndex = 0;

  private nextParam(): string {
    return `hv_${this.paramIndex++}`;
  }

  apply<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    groupBy: string[],
    aggregates: { fn: string; field: string }[],
    havingAst: ASTNode | null,
    joinPlanner: JoinPlanner,
  ): void {
    this.applyGroupBy(qb, groupBy, joinPlanner);
    this.applyAggregates(qb, aggregates, joinPlanner);
    this.applyHaving(qb, havingAst, joinPlanner);
  }

  private applyGroupBy<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    groupBy: string[],
    joinPlanner: JoinPlanner,
  ): void {
    let first = true;
    for (const gb of groupBy) {
      const { alias, column } = joinPlanner.registerPath(gb);
      const expr = `${alias}.${column}`;
      if (first) {
        qb.groupBy(expr);
        first = false;
      } else {
        qb.addGroupBy(expr);
      }
    }
  }

  private applyAggregates<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    aggregates: { fn: string; field: string }[],
    joinPlanner: JoinPlanner,
  ): void {
    for (const agg of aggregates) {
      const fnSql = AGG_FN_SQL[agg.fn.toLowerCase()];
      if (!fnSql) continue;
      const { alias, column } = joinPlanner.registerPath(agg.field);
      qb.addSelect(`${fnSql}(${alias}.${column})`, `${agg.fn}_${column}`);
    }
  }

  private applyHaving<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    havingAst: ASTNode | null,
    joinPlanner: JoinPlanner,
  ): void {
    if (!havingAst) return;

    this.paramIndex = 0;
    const params: Record<string, unknown> = {};
    const sql = this.buildHavingSql(havingAst, joinPlanner, params);
    if (sql) {
      qb.andHaving(sql, params);
    }
  }

  /**
   * Recursively build a raw SQL string for the HAVING clause.
   * Named params are collected into `params` and passed in a single `.andHaving()` call.
   */
  private buildHavingSql(
    node: ASTNode,
    joinPlanner: JoinPlanner,
    params: Record<string, unknown>,
  ): string {
    if (node.type === ASTNodeType.AND) {
      const parts = node.children
        .map((c) => this.buildHavingSql(c, joinPlanner, params))
        .filter(Boolean)
        .map((s) => `(${s})`);
      return parts.join(' AND ');
    }

    if (node.type === ASTNodeType.OR) {
      const parts = node.children
        .map((c) => this.buildHavingSql(c, joinPlanner, params))
        .filter(Boolean)
        .map((s) => `(${s})`);
      return parts.join(' OR ');
    }

    if (node.type === ASTNodeType.AGGREGATE) {
      return this.buildAggregateConditionSql(node, joinPlanner, params);
    }

    if (node.type === ASTNodeType.CONDITION) {
      return this.buildConditionSql(node, joinPlanner, params);
    }

    return '';
  }

  private buildAggregateConditionSql(
    node: AggregateConditionNode,
    joinPlanner: JoinPlanner,
    params: Record<string, unknown>,
  ): string {
    const fnSql = AGG_FN_SQL[node.fn];
    const opSql = AGG_OP_SQL[node.op];
    if (!fnSql || !opSql) return '';

    const { alias, column } = joinPlanner.registerPath(node.field);
    const p = this.nextParam();
    params[p] = node.value;
    return `${fnSql}(${alias}.${column}) ${opSql} :${p}`;
  }

  private buildConditionSql(
    node: ConditionNode,
    joinPlanner: JoinPlanner,
    params: Record<string, unknown>,
  ): string {
    const opSql = AGG_OP_SQL[node.op];
    if (!opSql) return '';

    const { alias, column } = joinPlanner.registerPath(node.field);
    const p = this.nextParam();
    params[p] = node.value;
    return `${alias}.${column} ${opSql} :${p}`;
  }
}
