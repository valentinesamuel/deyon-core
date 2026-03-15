import { DataSource, EntityManager, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { ParsedQuery, SortField } from '../types/query.types';
import { ModelQueryConfig, MODEL_QUERY_CONFIG_DEFAULTS } from '../types/modelConfig.types';
import { JoinPlanner } from '../planner/joinPlanner';
import { FilterPlanner } from '../planner/filterPlanner';
import { SelectPlanner } from '../planner/selectPlanner';
import { FilterBuilder } from './filterBuilder';
import { SortBuilder } from './sortBuilder';
import { applyCursorPagination, getEffectiveSortFields } from '../pagination/cursorPagination';
import { applyHybridSearch } from '../search/hybridSearch';
import { AggregationBuilder } from '../aggregation/aggregationBuilder';

/**
 * Main query builder orchestrator.
 * Wires JoinPlanner + FilterPlanner + SelectPlanner + FilterBuilder + SortBuilder
 * into a final SelectQueryBuilder ready for execution.
 */
export class QueryBuilderOrchestrator {
  private readonly filterBuilder = new FilterBuilder();
  private readonly sortBuilder = new SortBuilder();
  private readonly selectPlanner = new SelectPlanner();
  private readonly aggregationBuilder = new AggregationBuilder();

  build<T extends ObjectLiteral>(
    entityClass: new () => T,
    query: ParsedQuery,
    config: ModelQueryConfig,
    dataSource: DataSource,
    entityManager?: EntityManager,
  ): { qb: SelectQueryBuilder<T>; effectiveSortFields: SortField[] } {
    const maxJoins = config.maxJoins ?? MODEL_QUERY_CONFIG_DEFAULTS.maxJoins;

    const joinPlanner = new JoinPlanner(dataSource, entityClass, maxJoins);
    const filterPlanner = new FilterPlanner(joinPlanner);

    const isAggregating =
      query.groupBy.length > 0 || query.aggregates.length > 0 || !!query.havingAst;

    // Aggregating queries must not add an id tiebreaker — root.id is not in GROUP BY.
    // For normal queries, always append id for stable cursor pagination.
    const effectiveSortFields = isAggregating ? query.sort : getEffectiveSortFields(query.sort);

    // Plan filter joins — must happen before QB is created so joins are registered
    const filterPlan = filterPlanner.plan(query.whereAst);

    // Register sort joins (using effective sort fields to include id tiebreaker)
    for (const sf of effectiveSortFields) {
      joinPlanner.registerPath(sf.field);
    }

    // Register include= paths
    for (const inc of query.include) {
      joinPlanner.registerInclude(inc);
    }

    // Register groupBy paths
    for (const gb of query.groupBy) {
      const parts = gb.split('.');
      if (parts.length > 1) {
        joinPlanner.registerPath(gb);
      }
    }

    // Register joins for relation aliases in fields= so fields[role]=name works without include=role
    for (const alias of Object.keys(query.fields)) {
      if (alias !== 'root') {
        joinPlanner.registerInclude(alias);
      }
    }

    const repository = entityManager
      ? entityManager.getRepository(entityClass)
      : dataSource.getRepository(entityClass);

    const qb = repository.createQueryBuilder('root') as SelectQueryBuilder<T>;

    // Apply joins with optional soft-delete filter on JOIN ON clause
    for (const joinSpec of joinPlanner.getJoins()) {
      const joinPath = `${joinSpec.parentAlias}.${joinSpec.relationProperty}`;
      if (joinSpec.hasDeletedAt) {
        qb.leftJoin(joinPath, joinSpec.alias, `${joinSpec.alias}.deletedAt IS NULL`);
      } else {
        qb.leftJoin(joinPath, joinSpec.alias);
      }
    }

    // Apply root soft-delete unless withDeleted=true
    if (!query.withDeleted) {
      qb.andWhere('root.deletedAt IS NULL');
    }

    // Apply where filters
    this.filterBuilder.apply(qb, query.whereAst, filterPlan);

    // Apply hybrid search (FTS + trigram) — ANDed with filter conditions
    applyHybridSearch(qb, query.search, config, joinPlanner);

    // Apply aggregations: GROUP BY, aggregate SELECTs, HAVING
    if (query.groupBy.length > 0 || query.aggregates.length > 0 || query.havingAst) {
      this.aggregationBuilder.apply(
        qb,
        query.groupBy,
        query.aggregates,
        query.havingAst,
        joinPlanner,
      );
    }

    // Apply sort using effective sort fields for stable ordering
    this.sortBuilder.apply(qb, effectiveSortFields, joinPlanner);

    // Apply field selection
    if (Object.keys(query.fields).length > 0) {
      const selectPlan = this.selectPlanner.plan(query.fields);
      const selections: string[] = [];

      for (const [alias, cols] of selectPlan.columns.entries()) {
        const resolvedAlias =
          alias === 'root' ? 'root' : (joinPlanner.getAliasForPath(alias) ?? alias);
        for (const col of cols) {
          selections.push(`${resolvedAlias}.${col}`);
        }
      }

      if (selections.length > 0) {
        qb.select(selections);
      }
    } else if (isAggregating) {
      // When aggregating without explicit fields, select only the GROUP BY columns.
      // Aggregate expressions (COUNT, SUM, etc.) are already added via addSelect in AggregationBuilder.
      // Without this, TypeORM defaults to SELECT * which violates GROUP BY in PostgreSQL.
      const groupBySelections = query.groupBy.map((gb) => {
        const parts = gb.split('.');
        const column = parts[parts.length - 1];
        const relationParts = parts.slice(0, -1);
        if (relationParts.length === 0) {
          return `root.${column}`;
        }
        const alias = joinPlanner.getAliasForPath(relationParts.join('.'));
        return `${alias ?? 'root'}.${column}`;
      });
      if (groupBySelections.length > 0) {
        qb.select(groupBySelections);
      }
    }

    // Select all columns for include= joins not already covered by explicit fields.
    // Skip when aggregation is active — included columns would violate GROUP BY rules.
    if (!isAggregating) {
      const coveredAliases = new Set(
        Object.keys(query.fields).map((a) =>
          a === 'root' ? 'root' : (joinPlanner.getAliasForPath(a) ?? a),
        ),
      );
      for (const joinSpec of joinPlanner.getJoins()) {
        if (joinSpec.isInclude && !coveredAliases.has(joinSpec.alias)) {
          qb.addSelect(joinSpec.alias);
        }
      }
    }

    // Apply cursor pagination (sets limit+1 and cursor WHERE clause)
    applyCursorPagination(
      qb,
      query.cursor,
      effectiveSortFields,
      query.limit,
      (field) => joinPlanner.registerPath(field),
      isAggregating,
    );

    return { qb, effectiveSortFields };
  }
}
