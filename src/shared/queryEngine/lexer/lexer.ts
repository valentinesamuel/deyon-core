export const enum TokenType {
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  AND = 'AND',
  OR = 'OR',
  IDENT = 'IDENT',
  OP = 'OP',
  VALUE = 'VALUE',
  COMMA = 'COMMA',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
}

export class LexerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LexerError';
  }
}

const OPERATOR_CHARS = new Set(['=', '!', '<', '>']);

const KEYWORD_TOKENS = new Map<string, Token>([
  ['AND', { type: TokenType.AND, value: 'AND' }],
  ['OR', { type: TokenType.OR, value: 'OR' }],
  ['IN', { type: TokenType.OP, value: 'IN' }],
  ['LIKE', { type: TokenType.OP, value: 'LIKE' }],
  ['ILIKE', { type: TokenType.OP, value: 'ILIKE' }],
  ['BETWEEN', { type: TokenType.OP, value: 'BETWEEN' }],
  ['NULL', { type: TokenType.VALUE, value: 'null' }],
  ['TRUE', { type: TokenType.VALUE, value: 'true' }],
  ['FALSE', { type: TokenType.VALUE, value: 'false' }],
]);

function tokenizeOperator(input: string, pos: number): { token: Token; newPos: number } {
  let op = input[pos];
  pos++;
  if (pos < input.length && input[pos] === '=') {
    op += '=';
    pos++;
  }
  return { token: { type: TokenType.OP, value: op }, newPos: pos };
}

function tokenizeString(input: string, pos: number): { token: Token; newPos: number } {
  pos++; // skip opening quote
  let str = '';
  while (pos < input.length && input[pos] !== "'") {
    if (input[pos] === '\\' && pos + 1 < input.length) {
      pos++;
      str += input[pos];
    } else {
      str += input[pos];
    }
    pos++;
  }
  if (pos >= input.length) {
    throw new LexerError('Unterminated string literal');
  }
  pos++; // skip closing quote
  return { token: { type: TokenType.VALUE, value: str }, newPos: pos };
}

function tokenizeNumber(input: string, pos: number): { token: Token; newPos: number } {
  let num = input[pos] === '-' ? '-' : '';
  if (input[pos] === '-') pos++;
  while (pos < input.length && /[\d.]/.test(input[pos])) {
    num += input[pos];
    pos++;
  }
  return { token: { type: TokenType.VALUE, value: num }, newPos: pos };
}

function resolveIsKeyword(input: string, pos: number): { token: Token; newPos: number } | null {
  while (pos < input.length && /\s/.test(input[pos])) pos++;
  let next = '';
  while (pos < input.length && /[a-zA-Z]/.test(input[pos])) {
    next += input[pos];
    pos++;
  }
  if (next.toUpperCase() === 'NULL') {
    return { token: { type: TokenType.OP, value: 'IS NULL' }, newPos: pos };
  }
  if (next.toUpperCase() === 'NOT') {
    while (pos < input.length && /\s/.test(input[pos])) pos++;
    let notNext = '';
    while (pos < input.length && /[a-zA-Z]/.test(input[pos])) {
      notNext += input[pos];
      pos++;
    }
    if (notNext.toUpperCase() === 'NULL') {
      return { token: { type: TokenType.OP, value: 'IS NOT NULL' }, newPos: pos };
    }
    throw new LexerError(`Unexpected token after IS NOT: "${notNext}"`);
  }
  return null; // treat as IDENT (caller will use original pos)
}

function resolveNotKeyword(input: string, pos: number): { token: Token; newPos: number } | null {
  while (pos < input.length && /\s/.test(input[pos])) pos++;
  let next = '';
  while (pos < input.length && /[a-zA-Z]/.test(input[pos])) {
    next += input[pos];
    pos++;
  }
  if (next.toUpperCase() === 'IN') {
    return { token: { type: TokenType.OP, value: 'NOT IN' }, newPos: pos };
  }
  return null;
}

function tokenizeIdentifierOrKeyword(input: string, pos: number): { token: Token; newPos: number } {
  let ident = '';
  while (pos < input.length && /[a-zA-Z0-9_.%@-]/.test(input[pos])) {
    ident += input[pos];
    pos++;
  }

  const upper = ident.toUpperCase();
  const simpleToken = KEYWORD_TOKENS.get(upper);
  if (simpleToken) return { token: simpleToken, newPos: pos };

  if (upper === 'IS') {
    const result = resolveIsKeyword(input, pos);
    if (result) return result;
    return { token: { type: TokenType.IDENT, value: ident }, newPos: pos };
  }

  if (upper === 'NOT') {
    const result = resolveNotKeyword(input, pos);
    if (result) return result;
    return { token: { type: TokenType.IDENT, value: ident }, newPos: pos };
  }

  return { token: { type: TokenType.IDENT, value: ident }, newPos: pos };
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < input.length) {
    const ch = input[pos];

    // Skip whitespace
    if (/\s/.test(ch)) {
      pos++;
      continue;
    }

    // Left paren
    if (ch === '(') {
      tokens.push({ type: TokenType.LPAREN, value: '(' });
      pos++;
      continue;
    }

    // Right paren
    if (ch === ')') {
      tokens.push({ type: TokenType.RPAREN, value: ')' });
      pos++;
      continue;
    }

    // Comma
    if (ch === ',') {
      tokens.push({ type: TokenType.COMMA, value: ',' });
      pos++;
      continue;
    }

    // Operators: =, !=, >, >=, <, <=
    if (OPERATOR_CHARS.has(ch)) {
      const result = tokenizeOperator(input, pos);
      tokens.push(result.token);
      pos = result.newPos;
      continue;
    }

    // String value (single-quoted)
    if (ch === "'") {
      const result = tokenizeString(input, pos);
      tokens.push(result.token);
      pos = result.newPos;
      continue;
    }

    // Number value
    if (/\d/.test(ch) || (ch === '-' && /\d/.test(input[pos + 1] ?? ''))) {
      const result = tokenizeNumber(input, pos);
      tokens.push(result.token);
      pos = result.newPos;
      continue;
    }

    // Identifier or keyword
    if (/[a-zA-Z_]/.test(ch)) {
      const result = tokenizeIdentifierOrKeyword(input, pos);
      tokens.push(result.token);
      pos = result.newPos;
      continue;
    }

    throw new LexerError(`Unexpected character: "${ch}" at position ${pos}`);
  }

  tokens.push({ type: TokenType.EOF, value: '' });
  return tokens;
}
