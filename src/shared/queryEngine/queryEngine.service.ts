import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  HttpException,
} from '@nestjs/common';
import { DataSource, EntityManager, ObjectLiteral } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { QueryInput, ParsedQuery, SortField } from './types/query.types';
import { ModelQueryConfig } from './types/modelConfig.types';
import { CursorPage } from './types/result.types';
import { parseWhereClause, ParseError } from './parser/parser';
import { parseBracketFilter, mergeAsts, BracketParseError } from './parser/bracketParser';
import { QueryValidator } from './validation/queryValidator';
import { scoreComplexity } from './validation/complexityScorer';
import { QueryBuilderOrchestrator } from './sqlBuilder/queryBuilder';
import { SortBuilder } from './sqlBuilder/sortBuilder';
import { buildCursorPage, buildRawPage } from './pagination/cursorPagination';
import { QueryCache } from './cache/queryCache';
import { QueryAnalytics } from './analytics/queryAnalytics';
import { GetOneQueryDto } from './dto/getOneQuery.dto';
import { QueryValidationError } from './validation/queryValidator';
import { MODEL_QUERY_CONFIG_DEFAULTS } from './types/modelConfig.types';
import { JoinPlannerError } from './planner/joinPlanner';

@Injectable()
export class QueryEngineService {
  private readonly validator = new QueryValidator();
  private readonly qbOrchestrator = new QueryBuilderOrchestrator();
  private readonly logger = new Logger(QueryEngineService.name);

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

    try {
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

      const isAggregating =
        parsed.groupBy.length > 0 || parsed.aggregates.length > 0 || !!parsed.havingAst;

      let page: CursorPage<T>;
      if (isAggregating) {
        // 6a. Aggregating: use getRawMany() to preserve aggregate column values
        const rows = await qb.getRawMany<Record<string, unknown>>();
        page = buildRawPage(rows, parsed.limit) as unknown as CursorPage<T>;
      } else {
        // 6b. Normal: use getMany() for hydrated entities
        const rows = await qb.getMany();
        page = buildCursorPage(
          rows as unknown as Record<string, unknown>[],
          parsed.limit,
          effectiveSortFields,
        ) as unknown as CursorPage<T>;
      }

      const execTimeMs = Date.now() - start;

      // 7. Store in cache
      const ttl = config.cacheTtlSeconds ?? 60;
      await this.queryCache.set(entityClass.name, parsed, page, ttl);

      // 8. Emit analytics
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

      return page;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof ParseError || error instanceof BracketParseError) {
        throw new BadRequestException(`Invalid query syntax: ${(error as Error).message}`);
      }
      if (error instanceof JoinPlannerError) {
        throw new BadRequestException(`Invalid query: ${(error as Error).message}`);
      }
      this.logger.error(
        'Query execution error',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('An error occurred while processing your request');
    }
  }

  /**
   * Invalidate all cached results for a given entity.
   * Call this after mutations (create/update/delete) to keep cache fresh.
   */
  async invalidateCache(entityName: string): Promise<void> {
    await this.queryCache.invalidate(entityName);
  }

  async executeOne<T extends ObjectLiteral>(
    entityClass: new () => T,
    id: string,
    queryInput: GetOneQueryDto,
    config: ModelQueryConfig,
    entityManager?: EntityManager,
  ): Promise<T> {
    const { fieldsByAlias, includeRels } = this.parseSingleEntityInput(queryInput);
    this.validateSingleEntityInput(fieldsByAlias, includeRels, config);

    const repo = (entityManager ?? this.dataSource.manager).getRepository(entityClass);
    const qb = repo.createQueryBuilder('entity').where('entity.id = :id', { id });

    // Root fields
    const rootFields = fieldsByAlias['root'];
    if (rootFields) {
      const safeCols = ['id', ...rootFields].filter((f) => config.allowedFields.includes(f));
      qb.select(safeCols.map((f) => `entity.${f}`));
    }

    // Relations
    const allRels = new Set([
      ...Object.keys(fieldsByAlias).filter((k) => k !== 'root'),
      ...includeRels,
    ]);
    for (const rel of allRels) {
      const safeColsForRel = config.allowedFields
        .filter((f) => f.startsWith(`${rel}.`))
        .map((f) => f.slice(rel.length + 1));

      const requestedCols = fieldsByAlias[rel];
      const cols = requestedCols
        ? ['id', ...requestedCols].filter((c) => safeColsForRel.includes(c))
        : ['id', ...safeColsForRel];

      qb.leftJoin(`entity.${rel}`, rel).addSelect(cols.map((c) => `${rel}.${c}`));
    }

    try {
      const result = await qb.getOne();
      if (!result) {
        throw new BadRequestException(`${entityClass.name} not found`);
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof JoinPlannerError) {
        throw new BadRequestException(`Invalid query: ${(error as Error).message}`);
      }
      this.logger.error(
        'Query execution error',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('An error occurred while processing your request');
    }
  }

  private parseSingleEntityInput(input: GetOneQueryDto): {
    fieldsByAlias: Record<string, string[]>;
    includeRels: string[];
  } {
    const fieldsByAlias: Record<string, string[]> = {};

    if (input.fields) {
      for (const token of input.fields
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)) {
        const dotIdx = token.indexOf('.');
        if (dotIdx === -1) {
          (fieldsByAlias['root'] ??= []).push(token);
        } else {
          const rel = token.slice(0, dotIdx);
          const col = token.slice(dotIdx + 1);
          (fieldsByAlias[rel] ??= []).push(col);
        }
      }
    }

    const includeRels = input.include
      ? input.include
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    return { fieldsByAlias, includeRels };
  }

  private validateSingleEntityInput(
    fieldsByAlias: Record<string, string[]>,
    includeRels: string[],
    config: ModelQueryConfig,
  ): void {
    const maxJoins = config.maxJoins ?? MODEL_QUERY_CONFIG_DEFAULTS.maxJoins;
    const maxRelationDepth =
      config.maxRelationDepth ?? MODEL_QUERY_CONFIG_DEFAULTS.maxRelationDepth;

    const allRels = new Set([
      ...Object.keys(fieldsByAlias).filter((k) => k !== 'root'),
      ...includeRels,
    ]);

    if (allRels.size > maxJoins) {
      throw new QueryValidationError(
        `Too many joins: ${allRels.size} exceeds maximum ${maxJoins}`,
        { joinCount: allRels.size, maxJoins },
      );
    }

    for (const rel of allRels) {
      const depth = rel.split('.').length;
      if (depth > maxRelationDepth) {
        throw new QueryValidationError(
          `Relation "${rel}" exceeds maximum relation depth ${maxRelationDepth}`,
          { relation: rel, depth, maxRelationDepth },
        );
      }
      if (!config.allowedRelations.includes(rel)) {
        throw new QueryValidationError(`Relation "${rel}" is not allowed for include`, {
          relation: rel,
          allowedRelations: config.allowedRelations,
        });
      }
    }
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
