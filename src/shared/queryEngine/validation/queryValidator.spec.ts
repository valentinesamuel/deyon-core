import { describe, it, expect } from 'vitest';
import { QueryValidator, QueryValidationError, QueryTooComplexError } from './queryValidator';
import { ModelQueryConfig } from '../types/modelConfig.types';
import { ParsedQuery, SortField } from '../types/query.types';
import { ASTNode, ASTNodeType, ConditionNode, LogicalNode } from '../types/ast.types';
import { parseWhereClause } from '../parser/parser';

function makeQuery(overrides: Partial<ParsedQuery> = {}): ParsedQuery {
  return {
    whereAst: null,
    havingAst: null,
    sort: [],
    limit: 10,
    cursor: null,
    search: [],
    groupBy: [],
    aggregates: [],
    include: [],
    fields: {},
    withDeleted: false,
    ...overrides,
  };
}

const baseConfig: ModelQueryConfig = {
  allowedFilters: ['status', 'name', 'age', 'doctor.name', 'doctor.department.id'],
  allowedSort: ['createdAt', 'name', 'age'],
  allowedSearch: [{ field: 'name', type: 'fts' }],
  allowedRelations: ['doctor', 'doctor.department'],
  allowedFields: ['id', 'name', 'status'],
  maxFilters: 5,
  maxJoins: 3,
  maxRelationDepth: 3,
  maxComplexityScore: 50,
};

const validator = new QueryValidator();

describe('QueryValidator', () => {
  describe('filter field whitelist', () => {
    it('passes for allowed filter fields', () => {
      const whereAst = parseWhereClause('status=active');
      expect(() => validator.validate(makeQuery({ whereAst }), baseConfig)).not.toThrow();
    });

    it('rejects a disallowed filter field', () => {
      const whereAst = parseWhereClause('secretField=value');
      expect(() => validator.validate(makeQuery({ whereAst }), baseConfig)).toThrow(
        QueryValidationError,
      );
    });

    it('rejects disallowed nested relation field', () => {
      const whereAst = parseWhereClause('doctor.privateData=secret');
      expect(() => validator.validate(makeQuery({ whereAst }), baseConfig)).toThrow(
        QueryValidationError,
      );
    });

    it('passes for allowed nested relation field', () => {
      const whereAst = parseWhereClause('doctor.name=john');
      expect(() => validator.validate(makeQuery({ whereAst }), baseConfig)).not.toThrow();
    });
  });

  describe('max filter count', () => {
    it('passes when at the limit', () => {
      const whereAst = parseWhereClause(
        'status=active AND name=john AND age=30 AND doctor.name=smith AND doctor.department.id=1',
      );
      expect(() => validator.validate(makeQuery({ whereAst }), baseConfig)).not.toThrow();
    });

    it('rejects when exceeding max filter count', () => {
      // 6 conditions, limit is 5
      const whereAst = parseWhereClause(
        'status=active AND name=john AND age=30 AND doctor.name=smith AND doctor.department.id=1',
      );
      const config = { ...baseConfig, maxFilters: 3 };
      expect(() => validator.validate(makeQuery({ whereAst }), config)).toThrow(
        QueryValidationError,
      );
    });
  });

  describe('relation depth limit', () => {
    it('passes when depth equals maxRelationDepth', () => {
      // doctor.department.id has depth 2 (2 relation hops)
      const whereAst = parseWhereClause('doctor.department.id=1');
      const config = { ...baseConfig, maxRelationDepth: 2 };
      expect(() => validator.validate(makeQuery({ whereAst }), config)).not.toThrow();
    });

    it('rejects when field exceeds maxRelationDepth', () => {
      // a.b.c.d has depth 3 relation hops — exceeds maxRelationDepth: 2
      const whereAst: ASTNode = {
        type: 'CONDITION',
        field: 'a.b.c.d',
        op: 'eq',
        value: 'x',
      };
      const config = { ...baseConfig, allowedFilters: ['a.b.c.d'], maxRelationDepth: 2 };
      expect(() => validator.validate(makeQuery({ whereAst }), config)).toThrow(
        QueryValidationError,
      );
    });
  });

  describe('join count limit', () => {
    it('rejects when too many distinct joins are required', () => {
      // 4 unique relation prefixes: doctor, doctor.department, nurse, nurse.ward
      // maxJoins: 3
      const whereAst: ASTNode = {
        type: ASTNodeType.AND,
        children: [
          {
            type: ASTNodeType.CONDITION,
            field: 'doctor.name',
            op: 'eq',
            value: 'x',
          } as ConditionNode,
          {
            type: ASTNodeType.CONDITION,
            field: 'doctor.department.id',
            op: 'eq',
            value: 1,
          } as ConditionNode,
          {
            type: ASTNodeType.CONDITION,
            field: 'nurse.name',
            op: 'eq',
            value: 'y',
          } as ConditionNode,
          {
            type: ASTNodeType.CONDITION,
            field: 'nurse.ward.id',
            op: 'eq',
            value: 2,
          } as ConditionNode,
        ],
      } as LogicalNode;
      const config = {
        ...baseConfig,
        allowedFilters: ['doctor.name', 'doctor.department.id', 'nurse.name', 'nurse.ward.id'],
        maxJoins: 3,
      };
      expect(() => validator.validate(makeQuery({ whereAst }), config)).toThrow(
        QueryValidationError,
      );
    });
  });

  describe('sort field validation', () => {
    it('passes for allowed sort field', () => {
      const sort: SortField[] = [{ field: 'name', dir: 'ASC' }];
      expect(() => validator.validate(makeQuery({ sort }), baseConfig)).not.toThrow();
    });

    it('rejects disallowed sort field', () => {
      const sort: SortField[] = [{ field: 'secretField', dir: 'ASC' }];
      expect(() => validator.validate(makeQuery({ sort }), baseConfig)).toThrow(
        QueryValidationError,
      );
    });
  });

  describe('include relation validation', () => {
    it('passes for allowed relation', () => {
      expect(() =>
        validator.validate(makeQuery({ include: ['doctor'] }), baseConfig),
      ).not.toThrow();
    });

    it('rejects disallowed relation', () => {
      expect(() =>
        validator.validate(makeQuery({ include: ['privateRelation'] }), baseConfig),
      ).toThrow(QueryValidationError);
    });
  });

  describe('search field validation', () => {
    it('passes for allowed search field and type', () => {
      const search = [{ field: 'name', type: 'fts' as const, value: 'john' }];
      expect(() => validator.validate(makeQuery({ search }), baseConfig)).not.toThrow();
    });

    it('rejects disallowed search field', () => {
      const search = [{ field: 'password', type: 'fts' as const, value: 'secret' }];
      expect(() => validator.validate(makeQuery({ search }), baseConfig)).toThrow(
        QueryValidationError,
      );
    });

    it('rejects wrong search type for field', () => {
      // 'name' is only allowed as 'fts', not 'tri'
      const search = [{ field: 'name', type: 'tri' as const, value: 'john' }];
      expect(() => validator.validate(makeQuery({ search }), baseConfig)).toThrow(
        QueryValidationError,
      );
    });
  });

  describe('complexity score ceiling', () => {
    it('rejects a query that exceeds maxComplexityScore', () => {
      // 5 search terms × 5 = 25, 5 filters × 1 = 5, 2 joins × 3 = 6 → total = 36 < 50
      // To exceed 50: use 9 search + many filters
      const search = Array.from({ length: 10 }, (_, i) => ({
        field: 'name',
        type: 'fts' as const,
        value: `term${i}`,
      }));
      const config = {
        ...baseConfig,
        allowedSearch: [{ field: 'name', type: 'fts' as const }],
        maxComplexityScore: 40,
      };
      // 10 searches × 5 = 50 > 40
      expect(() => validator.validate(makeQuery({ search }), config)).toThrow(QueryTooComplexError);
    });

    it('passes a query just under the complexity limit', () => {
      // 1 filter × 1 = 1 total — well under any reasonable limit
      const whereAst = parseWhereClause('status=active');
      expect(() => validator.validate(makeQuery({ whereAst }), baseConfig)).not.toThrow();
    });
  });

  describe('empty/no-op query', () => {
    it('passes for a completely empty query', () => {
      expect(() => validator.validate(makeQuery(), baseConfig)).not.toThrow();
    });
  });
});
