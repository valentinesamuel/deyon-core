import {
  ASTNode,
  ASTNodeType,
  ConditionNode,
  LogicalNode,
  Operator,
  QueryValue,
} from '../types/ast.types';

export class BracketParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BracketParseError';
  }
}

const BRACKET_OP_MAP: Record<string, Operator> = {
  eq: 'eq',
  ne: 'ne',
  gt: 'gt',
  gte: 'gte',
  lt: 'lt',
  lte: 'lte',
  in: 'in',
  nin: 'nin',
  between: 'between',
  like: 'like',
  ilike: 'ilike',
  isNull: 'isNull',
  notNull: 'notNull',
};

function coerceValue(raw: string, op: Operator): QueryValue {
  if (op === 'isNull' || op === 'notNull') return null;

  if (op === 'in' || op === 'nin') {
    return raw.split(',').map((v) => v.trim());
  }

  if (op === 'between') {
    return raw.split(',').map((v) => v.trim());
  }

  if (raw === 'null') return null;

  if (raw === 'true') return true;
  if (raw === 'false') return false;

  const num = Number(raw);
  if (!isNaN(num) && raw.trim() !== '') return num;
  return raw;
}

/**
 * Parses bracket-style filter params into an AST.
 *
 * Input: { 'status': { 'eq': 'active' }, 'age': { 'gte': '18' } }
 * Output: LogicalNode(AND, [ConditionNode(status eq 'active'), ConditionNode(age gte 18)])
 */
export function parseBracketFilter(filter: Record<string, Record<string, string>>): ASTNode | null {
  const conditions: ConditionNode[] = [];

  for (const [field, ops] of Object.entries(filter)) {
    for (const [opKey, rawValue] of Object.entries(ops)) {
      const op = BRACKET_OP_MAP[opKey];
      if (!op) {
        throw new BracketParseError(`Unknown bracket operator: "${opKey}" for field "${field}"`);
      }
      const value = coerceValue(rawValue, op);
      conditions.push({ type: ASTNodeType.CONDITION, field, op, value });
    }
  }

  if (conditions.length === 0) return null;
  if (conditions.length === 1) return conditions[0];

  const node: LogicalNode = { type: ASTNodeType.AND, children: conditions };
  return node;
}

/**
 * Merges a DSL AST and a bracket AST into a single AND node.
 * If either is null, returns the other.
 */
export function mergeAsts(dslAst: ASTNode | null, bracketAst: ASTNode | null): ASTNode | null {
  if (!dslAst && !bracketAst) return null;
  if (!dslAst) return bracketAst;
  if (!bracketAst) return dslAst;

  const node: LogicalNode = { type: ASTNodeType.AND, children: [dslAst, bracketAst] };
  return node;
}
