import { BadRequestException } from '@nestjs/common';
import { ASTNode, ASTNodeType } from '../types/ast.types';
import { ParsedQuery } from '../types/query.types';
import { ModelQueryConfig, MODEL_QUERY_CONFIG_DEFAULTS } from '../types/modelConfig.types';
import { scoreComplexity } from './complexityScorer';

export class QueryValidationError extends BadRequestException {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ code: 'QUERY_VALIDATION_ERROR', message, details: details ?? {} });
  }
}

export class QueryTooComplexError extends BadRequestException {
  constructor(score: number, max: number) {
    super({
      code: 'QUERY_TOO_COMPLEX',
      message: `Query complexity score ${score} exceeds maximum allowed ${max}`,
      details: { score, max },
    });
  }
}

/**
 * Collect all field paths from an AST (leaf nodes only).
 */
function collectFields(node: ASTNode | null, fields: Set<string>): void {
  if (!node) return;
  if (node.type === ASTNodeType.AND || node.type === ASTNodeType.OR) {
    for (const child of node.children) {
      collectFields(child, fields);
    }
    return;
  }
  if (node.type === ASTNodeType.CONDITION || node.type === ASTNodeType.AGGREGATE) {
    fields.add(node.field);
  }
}

/**
 * Count leaf condition nodes in an AST.
 */
function countConditions(node: ASTNode | null): number {
  if (!node) return 0;
  if (node.type === ASTNodeType.AND || node.type === ASTNodeType.OR) {
    return node.children.reduce((sum, child) => sum + countConditions(child), 0);
  }
  return 1;
}

/**
 * Extract unique relation prefixes (each prefix = one join).
 * "doctor.department.name" → prefixes: "doctor", "doctor.department"
 */
function collectRelationPrefixes(node: ASTNode | null, prefixes: Set<string>): void {
  if (!node) return;
  if (node.type === ASTNodeType.AND || node.type === ASTNodeType.OR) {
    for (const child of node.children) {
      collectRelationPrefixes(child, prefixes);
    }
    return;
  }
  if (node.type !== ASTNodeType.CONDITION && node.type !== ASTNodeType.AGGREGATE) return;
  const parts = node.field.split('.');
  for (let i = 1; i < parts.length; i++) {
    prefixes.add(parts.slice(0, i).join('.'));
  }
}

/**
 * Return the depth (number of segments) of the deepest relation path in a field string.
 * e.g. "doctor.department.name" → depth 2 (two relation hops before the column).
 */
function maxDepthOfField(field: string): number {
  return field.split('.').length - 1;
}

export class QueryValidator {
  validate(query: ParsedQuery, config: ModelQueryConfig): void {
    const maxFilters = config.maxFilters ?? MODEL_QUERY_CONFIG_DEFAULTS.maxFilters;
    const maxJoins = config.maxJoins ?? MODEL_QUERY_CONFIG_DEFAULTS.maxJoins;
    const maxRelationDepth =
      config.maxRelationDepth ?? MODEL_QUERY_CONFIG_DEFAULTS.maxRelationDepth;
    const maxComplexityScore =
      config.maxComplexityScore ?? MODEL_QUERY_CONFIG_DEFAULTS.maxComplexityScore;

    const filterFields = new Set<string>();
    collectFields(query.whereAst, filterFields);
    collectFields(query.havingAst, filterFields);

    this.validateFilterFields(filterFields, config);
    this.validateFilterCount(
      countConditions(query.whereAst) + countConditions(query.havingAst),
      maxFilters,
    );
    this.validateRelationDepths(filterFields, maxRelationDepth);
    this.validateJoinCount(query, maxJoins);
    this.validateSortFields(query, config);
    this.validateIncludeRelations(query, config);
    this.validateSearchFields(query, config);
    this.validateAggregateFields(query, config);
    this.validateGroupByConsistency(query);
    this.validateComplexityScore(query, maxComplexityScore);
    this.validateAllowedFields(query, config);
  }

  private validateFilterFields(filterFields: Set<string>, config: ModelQueryConfig): void {
    for (const field of filterFields) {
      if (!config.allowedFilters.includes(field)) {
        throw new QueryValidationError(`Filter field "${field}" is not allowed`, {
          field,
          allowedFilters: config.allowedFilters,
        });
      }
    }
  }

  private validateFilterCount(filterCount: number, maxFilters: number): void {
    if (filterCount > maxFilters) {
      throw new QueryValidationError(
        `Too many filters: ${filterCount} exceeds maximum ${maxFilters}`,
        { filterCount, maxFilters },
      );
    }
  }

  private validateRelationDepths(filterFields: Set<string>, maxRelationDepth: number): void {
    for (const field of filterFields) {
      const depth = maxDepthOfField(field);
      if (depth > maxRelationDepth) {
        throw new QueryValidationError(
          `Filter field "${field}" exceeds maximum relation depth ${maxRelationDepth}`,
          { field, depth, maxRelationDepth },
        );
      }
    }
  }

  private validateJoinCount(query: ParsedQuery, maxJoins: number): void {
    const relationPrefixes = new Set<string>();
    collectRelationPrefixes(query.whereAst, relationPrefixes);
    collectRelationPrefixes(query.havingAst, relationPrefixes);
    for (const rel of query.include) {
      const parts = rel.split('.');
      for (let i = 1; i <= parts.length; i++) {
        relationPrefixes.add(parts.slice(0, i).join('.'));
      }
    }
    for (const gb of query.groupBy) {
      const parts = gb.split('.');
      for (let i = 1; i < parts.length; i++) {
        relationPrefixes.add(parts.slice(0, i).join('.'));
      }
    }
    if (relationPrefixes.size > maxJoins) {
      throw new QueryValidationError(
        `Too many joins: ${relationPrefixes.size} exceeds maximum ${maxJoins}`,
        { joinCount: relationPrefixes.size, maxJoins },
      );
    }
  }

  private validateSortFields(query: ParsedQuery, config: ModelQueryConfig): void {
    for (const sortField of query.sort) {
      if (!config.allowedSort.includes(sortField.field)) {
        throw new QueryValidationError(`Sort field "${sortField.field}" is not allowed`, {
          field: sortField.field,
          allowedSort: config.allowedSort,
        });
      }
    }
  }

  private validateIncludeRelations(query: ParsedQuery, config: ModelQueryConfig): void {
    for (const rel of query.include) {
      if (!config.allowedRelations.includes(rel)) {
        throw new QueryValidationError(`Relation "${rel}" is not allowed for include`, {
          relation: rel,
          allowedRelations: config.allowedRelations,
        });
      }
    }
  }

  private validateSearchFields(query: ParsedQuery, config: ModelQueryConfig): void {
    for (const s of query.search) {
      const allowed = config.allowedSearch.find((a) => a.field === s.field && a.type === s.type);
      if (!allowed) {
        throw new QueryValidationError(
          `Search on field "${s.field}" with type "${s.type}" is not allowed`,
          { field: s.field, type: s.type },
        );
      }
    }
  }

  private validateAggregateFields(query: ParsedQuery, config: ModelQueryConfig): void {
    for (const agg of query.aggregates) {
      if (!config.allowedFilters.includes(agg.field)) {
        throw new QueryValidationError(`Aggregate field "${agg.field}" is not allowed`, {
          field: agg.field,
          allowedFilters: config.allowedFilters,
        });
      }
    }
  }

  private validateGroupByConsistency(query: ParsedQuery): void {
    if (query.groupBy.length > 0 && query.aggregates.length === 0) {
      throw new QueryValidationError(
        'groupBy requires at least one aggregate function (e.g. aggregate[count]=id)',
        { groupBy: query.groupBy },
      );
    }

    if (query.havingAst && query.groupBy.length === 0) {
      throw new QueryValidationError('having requires groupBy to be specified', {});
    }

    const isAggregating =
      query.groupBy.length > 0 || query.aggregates.length > 0 || !!query.havingAst;
    if (isAggregating && query.cursor) {
      throw new QueryValidationError(
        'cursor pagination is not supported with groupBy/aggregate queries',
        {},
      );
    }
  }

  private validateComplexityScore(query: ParsedQuery, maxComplexityScore: number): void {
    const breakdown = scoreComplexity(query);
    if (breakdown.total > maxComplexityScore) {
      throw new QueryTooComplexError(breakdown.total, maxComplexityScore);
    }
  }

  private validateAllowedFields(query: ParsedQuery, config: ModelQueryConfig): void {
    if (!config.allowedFields || config.allowedFields.length === 0) return;
    for (const [alias, cols] of Object.entries(query.fields)) {
      for (const col of cols) {
        if (col === 'id') continue;
        const fieldPath = alias === 'root' ? col : `${alias}.${col}`;
        if (!config.allowedFields.includes(fieldPath)) {
          throw new QueryValidationError(`Field "${fieldPath}" is not allowed`, {
            field: fieldPath,
            allowedFields: config.allowedFields,
          });
        }
      }
    }
  }
}
