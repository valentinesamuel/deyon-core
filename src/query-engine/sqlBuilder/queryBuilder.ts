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

    // Compute effective sort fields (with id tiebreaker) for stable cursor pagination
    const effectiveSortFields = getEffectiveSortFields(query.sort);

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
        for (const col of cols) {
          selections.push(`${alias}.${col}`);
        }
      }

      if (selections.length > 0) {
        qb.select(selections);
      }
    }

    // Apply cursor pagination (sets limit+1 and cursor WHERE clause)
    applyCursorPagination(qb, query.cursor, effectiveSortFields, query.limit, (field) =>
      joinPlanner.registerPath(field),
    );

    return { qb, effectiveSortFields };
  }
}
