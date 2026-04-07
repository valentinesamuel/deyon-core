import { Episode } from '@modules/core/entities/episode.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const EPISODE_QUERY_CONFIG: EntityQueryConfig<Episode> = {
  allowedFilters: ['id', 'patientId', 'status', 'type', 'episodeNumber', 'isLockedForAudit'],
  allowedSort: ['createdAt', 'status', 'type', 'episodeNumber'],
  allowedSearch: [{ field: 'episodeNumber', type: 'fts' }],
  allowedRelations: ['patient', 'vitals', 'logs'],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 10,
};
