export type Operator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'between'
  | 'like'
  | 'ilike'
  | 'isNull'
  | 'notNull';

export type QueryValue = string | number | string[] | number[] | null;

export type AggregateFn = 'count' | 'sum' | 'avg' | 'min' | 'max';

export enum ASTNodeType {
  AND = 'AND',
  OR = 'OR',
  CONDITION = 'CONDITION',
  AGGREGATE = 'AGGREGATE',
}

export interface LogicalNode {
  type: ASTNodeType.AND | ASTNodeType.OR;
  children: ASTNode[];
}

export interface ConditionNode {
  type: ASTNodeType.CONDITION;
  field: string;
  op: Operator;
  value: QueryValue;
}

export interface AggregateConditionNode {
  type: ASTNodeType.AGGREGATE;
  fn: AggregateFn;
  field: string;
  op: Operator;
  value: number;
}

export type ASTNode = LogicalNode | ConditionNode | AggregateConditionNode;
