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

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < input.length) {
    // Skip whitespace
    if (/\s/.test(input[pos])) {
      pos++;
      continue;
    }

    // Left paren
    if (input[pos] === '(') {
      tokens.push({ type: TokenType.LPAREN, value: '(' });
      pos++;
      continue;
    }

    // Right paren
    if (input[pos] === ')') {
      tokens.push({ type: TokenType.RPAREN, value: ')' });
      pos++;
      continue;
    }

    // Comma
    if (input[pos] === ',') {
      tokens.push({ type: TokenType.COMMA, value: ',' });
      pos++;
      continue;
    }

    // Operators: =, !=, >, >=, <, <=
    if (OPERATOR_CHARS.has(input[pos])) {
      let op = input[pos];
      pos++;
      if (pos < input.length && input[pos] === '=') {
        op += '=';
        pos++;
      }
      tokens.push({ type: TokenType.OP, value: op });
      continue;
    }

    // String value (single-quoted)
    if (input[pos] === "'") {
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
      tokens.push({ type: TokenType.VALUE, value: str });
      continue;
    }

    // Number value or identifier/keyword
    if (/[0-9]/.test(input[pos]) || (input[pos] === '-' && /[0-9]/.test(input[pos + 1] ?? ''))) {
      let num = input[pos] === '-' ? '-' : '';
      if (input[pos] === '-') pos++;
      while (pos < input.length && /[0-9.]/.test(input[pos])) {
        num += input[pos];
        pos++;
      }
      tokens.push({ type: TokenType.VALUE, value: num });
      continue;
    }

    // NULL keyword or boolean or identifier/keyword
    if (/[a-zA-Z_]/.test(input[pos])) {
      let ident = '';
      while (pos < input.length && /[a-zA-Z0-9_.%@-]/.test(input[pos])) {
        ident += input[pos];
        pos++;
      }

      const upper = ident.toUpperCase();
      if (upper === 'AND') {
        tokens.push({ type: TokenType.AND, value: 'AND' });
      } else if (upper === 'OR') {
        tokens.push({ type: TokenType.OR, value: 'OR' });
      } else if (upper === 'IN') {
        tokens.push({ type: TokenType.OP, value: 'IN' });
      } else if (upper === 'LIKE') {
        tokens.push({ type: TokenType.OP, value: 'LIKE' });
      } else if (upper === 'ILIKE') {
        tokens.push({ type: TokenType.OP, value: 'ILIKE' });
      } else if (upper === 'IS') {
        // Peek ahead for IS NULL / IS NOT NULL
        const saved = pos;
        while (pos < input.length && /\s/.test(input[pos])) pos++;
        let next = '';
        while (pos < input.length && /[a-zA-Z]/.test(input[pos])) {
          next += input[pos];
          pos++;
        }
        if (next.toUpperCase() === 'NULL') {
          tokens.push({ type: TokenType.OP, value: 'IS NULL' });
        } else if (next.toUpperCase() === 'NOT') {
          while (pos < input.length && /\s/.test(input[pos])) pos++;
          let notNext = '';
          while (pos < input.length && /[a-zA-Z]/.test(input[pos])) {
            notNext += input[pos];
            pos++;
          }
          if (notNext.toUpperCase() === 'NULL') {
            tokens.push({ type: TokenType.OP, value: 'IS NOT NULL' });
          } else {
            throw new LexerError(`Unexpected token after IS NOT: "${notNext}"`);
          }
        } else {
          // Restore and treat as IDENT
          pos = saved;
          tokens.push({ type: TokenType.IDENT, value: ident });
        }
      } else if (upper === 'NULL') {
        tokens.push({ type: TokenType.VALUE, value: 'null' });
      } else if (upper === 'TRUE') {
        tokens.push({ type: TokenType.VALUE, value: 'true' });
      } else if (upper === 'FALSE') {
        tokens.push({ type: TokenType.VALUE, value: 'false' });
      } else if (upper === 'BETWEEN') {
        tokens.push({ type: TokenType.OP, value: 'BETWEEN' });
      } else if (upper === 'NOT') {
        // Check for NOT IN
        const saved = pos;
        while (pos < input.length && /\s/.test(input[pos])) pos++;
        let next = '';
        while (pos < input.length && /[a-zA-Z]/.test(input[pos])) {
          next += input[pos];
          pos++;
        }
        if (next.toUpperCase() === 'IN') {
          tokens.push({ type: TokenType.OP, value: 'NOT IN' });
        } else {
          pos = saved;
          tokens.push({ type: TokenType.IDENT, value: ident });
        }
      } else {
        tokens.push({ type: TokenType.IDENT, value: ident });
      }
      continue;
    }

    throw new LexerError(`Unexpected character: "${input[pos]}" at position ${pos}`);
  }

  tokens.push({ type: TokenType.EOF, value: '' });
  return tokens;
}
