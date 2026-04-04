import { Shift } from '@modules/core/entities/shift.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const SHIFT_QUERY_CONFIG: EntityQueryConfig<Shift> = {
  allowedFilters: ['id', 'staffId', 'status', 'station', 'departmentId'],
  allowedSort: ['createdAt', 'startedAt', 'endedAt'],
  allowedSearch: [],
  allowedRelations: ['staff', 'department', 'payments'],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 5,
};
