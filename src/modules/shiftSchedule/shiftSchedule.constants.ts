import { ShiftSchedule } from '@modules/core/entities/shiftSchedule.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const SHIFT_SCHEDULE_QUERY_CONFIG: EntityQueryConfig<ShiftSchedule> = {
  allowedFilters: ['id', 'day', 'timeOfDay'],
  allowedSort: ['day', 'timeOfDay', 'createdAt'],
  allowedSearch: [],
  allowedRelations: [],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};
