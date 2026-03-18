import { SelectQueryBuilder, Brackets, WhereExpressionBuilder, ObjectLiteral } from 'typeorm';
import {
  ASTNode,
  ASTNodeType,
  ConditionNode,
  AggregateConditionNode,
  LogicalNode,
} from '../types/ast.types';
import { FilterPlan } from '../planner/filterPlanner';

/**
 * Converts an AST into TypeORM QB where clauses using Brackets for grouping.
 * Named params use `:qe_p{n}` prefix to avoid collision.
 */
export class FilterBuilder {
  private paramIndex = 0;

  private nextParam(): string {
    return `qe_p${this.paramIndex++}`;
  }

  /**
   * Apply the where AST to the query builder.
   */
  apply<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    node: ASTNode | null,
    filterPlan: FilterPlan,
  ): void {
    if (!node) return;
    this.paramIndex = 0;
    qb.andWhere(this.buildBrackets(node, filterPlan));
  }

  private buildBrackets(node: ASTNode, filterPlan: FilterPlan): Brackets {
    return new Brackets((qb) => {
      this.applyNode(qb, node, filterPlan);
    });
  }

  private applyNode(qb: WhereExpressionBuilder, node: ASTNode, filterPlan: FilterPlan): void {
    if (node.type === ASTNodeType.AND) {
      this.applyAndNode(qb, node, filterPlan);
      return;
    }
    if (node.type === ASTNodeType.OR) {
      this.applyOrNode(qb, node, filterPlan);
      return;
    }
    const sql = this.buildConditionSql(node as ConditionNode | AggregateConditionNode, filterPlan);
    if (sql) qb.andWhere(sql.clause, sql.params);
  }

  private applyAndNode(
    qb: WhereExpressionBuilder,
    node: LogicalNode,
    filterPlan: FilterPlan,
  ): void {
    for (const child of node.children) {
      if (child.type === ASTNodeType.AND || child.type === ASTNodeType.OR) {
        qb.andWhere(this.buildBrackets(child, filterPlan));
      } else {
        const sql = this.buildConditionSql(
          child as ConditionNode | AggregateConditionNode,
          filterPlan,
        );
        if (sql) qb.andWhere(sql.clause, sql.params);
      }
    }
  }

  private applyOrNode(qb: WhereExpressionBuilder, node: LogicalNode, filterPlan: FilterPlan): void {
    let isFirst = true;
    for (const child of node.children) {
      this.applyOrChild(qb, child, isFirst, filterPlan);
      isFirst = false;
    }
  }

  private applyOrChild(
    qb: WhereExpressionBuilder,
    child: ASTNode,
    isFirst: boolean,
    filterPlan: FilterPlan,
  ): void {
    if (child.type === ASTNodeType.AND || child.type === ASTNodeType.OR) {
      const brackets = this.buildBrackets(child, filterPlan);
      if (isFirst) {
        qb.where(brackets);
      } else {
        qb.orWhere(brackets);
      }
      return;
    }
    const sql = this.buildConditionSql(child as ConditionNode | AggregateConditionNode, filterPlan);
    if (sql) {
      if (isFirst) {
        qb.where(sql.clause, sql.params);
      } else {
        qb.orWhere(sql.clause, sql.params);
      }
    }
  }

  private buildConditionSql(
    node: ConditionNode | AggregateConditionNode,
    filterPlan: FilterPlan,
  ): { clause: string; params: Record<string, unknown> } | null {
    const resolved = filterPlan.resolvedConditions.get(node);
    if (!resolved) return null;

    const { alias, column } = resolved;
    const col = `${alias}.${column}`;
    const { op } = node;

    if (op === 'isNull') {
      return { clause: `${col} IS NULL`, params: {} };
    }

    if (op === 'notNull') {
      return { clause: `${col} IS NOT NULL`, params: {} };
    }

    if (op === 'in') {
      const p = this.nextParam();
      return { clause: `${col} IN (:...${p})`, params: { [p]: node.value } };
    }

    if (op === 'nin') {
      const p = this.nextParam();
      return { clause: `${col} NOT IN (:...${p})`, params: { [p]: node.value } };
    }

    if (op === 'between') {
      const p0 = this.nextParam();
      const p1 = this.nextParam();
      const vals = node.value as string[];
      return {
        clause: `${col} BETWEEN :${p0} AND :${p1}`,
        params: { [p0]: vals[0], [p1]: vals[1] },
      };
    }

    if (op === 'like') {
      const p = this.nextParam();
      return { clause: `${col} LIKE :${p}`, params: { [p]: node.value } };
    }

    if (op === 'ilike') {
      const p = this.nextParam();
      return { clause: `${col} ILIKE :${p}`, params: { [p]: node.value } };
    }

    const opSqlMap: Record<string, string> = {
      eq: '=',
      ne: '!=',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
    };
    const opSql = opSqlMap[op];
    if (opSql) {
      const p = this.nextParam();
      return { clause: `${col} ${opSql} :${p}`, params: { [p]: node.value } };
    }

    return null;
  }
}
