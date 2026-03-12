import { Token, TokenType, tokenize } from '../lexer/lexer';
import {
  ASTNode,
  ASTNodeType,
  AggregateConditionNode,
  AggregateFn,
  ConditionNode,
  LogicalNode,
  Operator,
  QueryValue,
} from '../types/ast.types';

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

const OP_MAP: Record<string, Operator> = {
  '=': 'eq',
  '!=': 'ne',
  '>': 'gt',
  '>=': 'gte',
  '<': 'lt',
  '<=': 'lte',
  IN: 'in',
  'NOT IN': 'nin',
  LIKE: 'like',
  ILIKE: 'ilike',
  BETWEEN: 'between',
  'IS NULL': 'isNull',
  'IS NOT NULL': 'notNull',
};

const AGGREGATE_FNS = new Set<string>(['count', 'sum', 'avg', 'min', 'max']);

export class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const token = this.tokens[this.pos];
    this.pos++;
    return token;
  }

  private expect(type: TokenType): Token {
    const token = this.consume();
    if (token.type !== type) {
      throw new ParseError(`Expected ${type} but got ${token.type} ("${token.value}")`);
    }
    return token;
  }

  parse(): ASTNode | null {
    if (this.peek().type === TokenType.EOF) {
      return null;
    }
    const node = this.parseExpression();
    if (this.peek().type !== TokenType.EOF) {
      throw new ParseError(`Unexpected token: "${this.peek().value}"`);
    }
    return node;
  }

  private parseExpression(): ASTNode {
    const left = this.parseTerm();
    const children: ASTNode[] = [left];

    while (this.peek().type === TokenType.OR) {
      this.consume(); // consume OR
      children.push(this.parseTerm());
    }

    if (children.length === 1) return children[0];

    const node: LogicalNode = { type: ASTNodeType.OR, children };
    return node;
  }

  private parseTerm(): ASTNode {
    const left = this.parseFactor();
    const children: ASTNode[] = [left];

    while (this.peek().type === TokenType.AND) {
      this.consume(); // consume AND
      children.push(this.parseFactor());
    }

    if (children.length === 1) return children[0];

    const node: LogicalNode = { type: ASTNodeType.AND, children };
    return node;
  }

  private parseFactor(): ASTNode {
    if (this.peek().type === TokenType.LPAREN) {
      this.consume(); // consume (
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN);
      return expr;
    }
    return this.parseCondition();
  }

  private parseCondition(): ASTNode {
    const identToken = this.peek();
    if (identToken.type !== TokenType.IDENT) {
      throw new ParseError(
        `Expected field name but got ${identToken.type} ("${identToken.value}")`,
      );
    }

    // Check for aggregate function: count(field) op value
    const ident = identToken.value.toLowerCase();
    if (AGGREGATE_FNS.has(ident)) {
      return this.parseAggregateCondition(ident as AggregateFn);
    }

    this.consume(); // consume field ident
    const field = identToken.value;

    const opToken = this.peek();
    if (opToken.type !== TokenType.OP) {
      throw new ParseError(`Expected operator but got ${opToken.type} ("${opToken.value}")`);
    }
    this.consume();

    const op = OP_MAP[opToken.value];
    if (!op) {
      throw new ParseError(`Unknown operator: "${opToken.value}"`);
    }

    if (op === 'isNull' || op === 'notNull') {
      const node: ConditionNode = { type: ASTNodeType.CONDITION, field, op, value: null };
      return node;
    }

    if (op === 'in' || op === 'nin') {
      const values = this.parseList();
      const node: ConditionNode = { type: ASTNodeType.CONDITION, field, op, value: values };
      return node;
    }

    if (op === 'between') {
      const lo = this.parseSingleValue();
      // Optionally consume AND keyword between BETWEEN values
      if (this.peek().type === TokenType.AND) {
        this.consume();
      } else if (this.peek().type === TokenType.COMMA) {
        this.consume();
      }
      const hi = this.parseSingleValue();
      const node: ConditionNode = {
        type: ASTNodeType.CONDITION,
        field,
        op,
        value: [String(lo), String(hi)],
      };
      return node;
    }

    const value = this.parseSingleValue();
    const node: ConditionNode = { type: ASTNodeType.CONDITION, field, op, value };
    return node;
  }

  private parseAggregateCondition(fn: AggregateFn): AggregateConditionNode {
    this.consume(); // consume fn ident
    this.expect(TokenType.LPAREN);
    const fieldToken = this.expect(TokenType.IDENT);
    this.expect(TokenType.RPAREN);

    const opToken = this.peek();
    if (opToken.type !== TokenType.OP) {
      throw new ParseError(`Expected operator after aggregate function but got ${opToken.type}`);
    }
    this.consume();

    const op = OP_MAP[opToken.value];
    if (!op) {
      throw new ParseError(`Unknown operator in aggregate condition: "${opToken.value}"`);
    }

    const valueToken = this.expect(TokenType.VALUE);
    const value = Number(valueToken.value);
    if (isNaN(value)) {
      throw new ParseError(`Aggregate condition value must be numeric, got "${valueToken.value}"`);
    }

    const node: AggregateConditionNode = {
      type: ASTNodeType.AGGREGATE,
      fn,
      field: fieldToken.value,
      op,
      value,
    };
    return node;
  }

  private parseList(): string[] {
    this.expect(TokenType.LPAREN);
    const values: string[] = [];
    if (this.peek().type !== TokenType.RPAREN) {
      values.push(String(this.parseSingleValue()));
      while (this.peek().type === TokenType.COMMA) {
        this.consume();
        values.push(String(this.parseSingleValue()));
      }
    }
    this.expect(TokenType.RPAREN);
    return values;
  }

  private parseSingleValue(): QueryValue {
    const token = this.peek();
    if (token.type === TokenType.VALUE) {
      this.consume();
      const raw = token.value;
      if (raw === 'null') return null;
      if (raw === 'true') return 'true';
      if (raw === 'false') return 'false';
      const num = Number(raw);
      if (!isNaN(num) && raw !== '') return num;
      return raw;
    }
    // Allow IDENT as a bare string value (e.g., status=active without quotes)
    if (token.type === TokenType.IDENT) {
      this.consume();
      return token.value;
    }
    throw new ParseError(`Expected value but got ${token.type} ("${token.value}")`);
  }
}

export function parseWhereClause(input: string): ASTNode | null {
  if (!input || input.trim() === '') return null;
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  return parser.parse();
}
