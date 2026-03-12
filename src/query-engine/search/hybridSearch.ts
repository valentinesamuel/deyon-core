import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { SearchInput } from '../types/query.types';
import { ModelQueryConfig, MODEL_QUERY_CONFIG_DEFAULTS } from '../types/modelConfig.types';
import { JoinPlanner } from '../planner/joinPlanner';

/**
 * Applies FTS and trigram search conditions to a SelectQueryBuilder.
 *
 * - FTS: `to_tsvector('english', alias.col) @@ plainto_tsquery('english', :q)`
 * - Trigram: `alias.col % :q` (requires pg_trgm extension)
 *
 * All search conditions are ANDed with each other and with the main where= filter.
 *
 * Index recommendations (migrations handle creation):
 *   FTS:      CREATE INDEX ... ON table USING GIN(to_tsvector('english', column));
 *   Trigram:  CREATE INDEX ... ON table USING GIN(column gin_trgm_ops);
 */
export function applyHybridSearch<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  search: SearchInput[],
  config: ModelQueryConfig,
  joinPlanner: JoinPlanner,
): void {
  if (search.length === 0) return;

  const threshold = config.trigramThreshold ?? MODEL_QUERY_CONFIG_DEFAULTS.trigramThreshold;

  search.forEach((s, idx) => {
    const { alias, column } = joinPlanner.registerPath(s.field);
    const paramName = `qe_search_${idx}`;

    if (s.type === 'fts') {
      qb.andWhere(
        `to_tsvector('english', ${alias}.${column}) @@ plainto_tsquery('english', :${paramName})`,
        { [paramName]: s.value },
      );
    } else {
      // tri — set similarity threshold per query then apply % operator
      qb.andWhere(
        `(set_limit(:${paramName}_thr) IS NOT NULL AND ${alias}.${column} % :${paramName})`,
        { [`${paramName}_thr`]: threshold, [paramName]: s.value },
      );
    }
  });
}
