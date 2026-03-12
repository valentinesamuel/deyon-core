import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, ObjectLiteral } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { QueryInput, ParsedQuery, SortField } from './types/query.types';
import { ModelQueryConfig } from './types/modelConfig.types';
import { CursorPage } from './types/result.types';
import { parseWhereClause } from './parser/parser';
import { parseBracketFilter, mergeAsts } from './parser/bracketParser';
import { QueryValidator } from './validation/queryValidator';
import { scoreComplexity } from './validation/complexityScorer';
import { QueryBuilderOrchestrator } from './sqlBuilder/queryBuilder';
import { SortBuilder } from './sqlBuilder/sortBuilder';
import { buildCursorPage } from './pagination/cursorPagination';
import { QueryCache } from './cache/queryCache';
import { QueryAnalytics } from './analytics/queryAnalytics';

@Injectable()
export class QueryEngineService {
  private readonly validator = new QueryValidator();
  private readonly qbOrchestrator = new QueryBuilderOrchestrator();

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly queryCache: QueryCache,
    private readonly queryAnalytics: QueryAnalytics,
  ) {}

  async execute<T extends ObjectLiteral>(
    entityClass: new () => T,
    queryInput: QueryInput,
    config: ModelQueryConfig,
    entityManager?: EntityManager,
  ): Promise<CursorPage<T>> {
    const start = Date.now();

    // 1. Parse query input into a structured ParsedQuery
    const parsed = this.parseQueryInput(queryInput);

    // 2. Validate parsed query against config
    this.validator.validate(parsed, config);

    // 3. Compute complexity score
    const { total: queryCost } = scoreComplexity(parsed);

    // 4. Check cache
    const cached = await this.queryCache.get<CursorPage<T>>(entityClass.name, parsed);
    if (cached) {
      const execTimeMs = Date.now() - start;
      this.queryAnalytics.log({
        entity: entityClass.name,
        execTimeMs,
        joinsUsed: parsed.include.length,
        filtersUsed: parsed.whereAst ? 1 : 0,
        searchUsed: parsed.search.length > 0,
        aggregationsUsed: parsed.aggregates.length > 0 || parsed.groupBy.length > 0,
        rowsReturned: cached.data.length,
        cacheHit: true,
        queryCost,
      });
      return cached;
    }

    // 5. Build the query (returns QB + effective sort fields with id tiebreaker)
    const { qb, effectiveSortFields } = this.qbOrchestrator.build(
      entityClass,
      parsed,
      config,
      this.dataSource,
      entityManager,
    );

    // 6. Execute: fetches limit+1 rows to detect hasMore
    const rows = await qb.getMany();
    const execTimeMs = Date.now() - start;

    // 7. Build cursor page from fetched rows
    const page = buildCursorPage(
      rows as unknown as Record<string, unknown>[],
      parsed.limit,
      effectiveSortFields,
    );

    // 8. Store in cache
    const ttl = config.cacheTtlSeconds ?? 60;
    await this.queryCache.set(entityClass.name, parsed, page, ttl);

    // 9. Emit analytics
    this.queryAnalytics.log({
      entity: entityClass.name,
      execTimeMs,
      joinsUsed: parsed.include.length,
      filtersUsed: parsed.whereAst ? 1 : 0,
      searchUsed: parsed.search.length > 0,
      aggregationsUsed: parsed.aggregates.length > 0 || parsed.groupBy.length > 0,
      rowsReturned: page.data.length,
      cacheHit: false,
      queryCost,
    });

    return page as unknown as CursorPage<T>;
  }

  /**
   * Invalidate all cached results for a given entity.
   * Call this after mutations (create/update/delete) to keep cache fresh.
   */
  async invalidateCache(entityName: string): Promise<void> {
    await this.queryCache.invalidate(entityName);
  }

  private parseQueryInput(input: QueryInput): ParsedQuery {
    // Parse where= DSL
    const dslAst = input.where ? parseWhereClause(input.where) : null;

    // Parse bracket-style filters
    const bracketAst = input.filter ? parseBracketFilter(input.filter) : null;

    // Merge both ASTs
    const whereAst = mergeAsts(dslAst, bracketAst);

    // Parse having= DSL
    const havingAst = input.having ? parseWhereClause(input.having) : null;

    // Parse sort
    const sort: SortField[] = input.sort ? SortBuilder.parse(input.sort) : [];

    // Parse limit
    const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 1000) : 20;

    // Parse cursor
    const cursor = input.cursor ?? null;

    // Parse search inputs
    const search = input.search
      ? Object.entries(input.search).flatMap(([field, types]) =>
          Object.entries(types).map(([type, value]) => ({
            field,
            type: type as 'fts' | 'tri',
            value,
          })),
        )
      : [];

    // Parse groupBy
    const groupBy = input.groupBy
      ? input.groupBy
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    // Parse aggregates
    const aggregates = input.aggregate
      ? Object.entries(input.aggregate).map(([fn, field]) => ({ fn, field }))
      : [];

    // Parse include
    const include = input.include
      ? input.include
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    // Parse fields
    const fields: Record<string, string[]> = {};
    if (input.fields) {
      for (const [alias, colStr] of Object.entries(input.fields)) {
        fields[alias] = colStr
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    return {
      whereAst,
      havingAst,
      sort,
      limit,
      cursor,
      search,
      groupBy,
      aggregates,
      include,
      fields,
      withDeleted: input.withDeleted ?? false,
    };
  }
}
