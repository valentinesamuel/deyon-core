export { QueryEngineService } from './queryEngine.service';
export { QueryEngineModule } from './queryEngine.module';

// Types
export type { ModelQueryConfig } from './types/modelConfig.types';
export type { EntityQueryConfig, DeepKeyOf, TypedSearchField } from './types/entityConfig.types';
export { GetAllQueryDto } from './dto/getAllQuery.dto';
export type { QueryResult, CursorPage, CursorMeta } from './types/result.types';
export type { QueryInput, ParsedQuery, SortField, SearchInput } from './types/query.types';
export type {
  ASTNode,
  ConditionNode,
  LogicalNode,
  AggregateConditionNode,
} from './types/ast.types';
export { ASTNodeType } from './types/ast.types';
export type { Operator, QueryValue, AggregateFn } from './types/ast.types';
export type { JoinSpec } from './planner/joinPlanner';
export type { CursorValues } from './pagination/cursorPagination';

// Cursor pagination utilities
export {
  encodeCursor,
  decodeCursor,
  getEffectiveSortFields,
  buildCursorWhereClause,
  applyCursorPagination,
  extractCursorValues,
  buildCursorPage,
} from './pagination/cursorPagination';

// Errors
export { QueryValidationError, QueryTooComplexError } from './validation/queryValidator';

// Cache + Analytics
export { QueryCache } from './cache/queryCache';
export { QueryAnalytics } from './analytics/queryAnalytics';
export type { QueryAnalyticsPayload } from './analytics/queryAnalytics';
