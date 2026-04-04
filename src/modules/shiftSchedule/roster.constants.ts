import { Roster } from '@modules/core/entities/roster.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const ROSTER_QUERY_CONFIG: EntityQueryConfig<Roster> = {
  allowedFilters: ['id', 'status', 'weekStartDate', 'publishedById'],
  allowedSort: ['weekStartDate', 'createdAt', 'status'],
  allowedSearch: [],
  allowedRelations: ['publishedBy', 'assignments'],
  allowedFields: [],
  maxRelationDepth: 2,
  cacheTtlSeconds: 30,
};
