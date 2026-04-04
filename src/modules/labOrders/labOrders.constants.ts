import { LabOrder } from '@modules/core/entities/labOrder.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const LAB_ORDER_QUERY_CONFIG: EntityQueryConfig<LabOrder> = {
  allowedFilters: ['id', 'patientId', 'doctorId', 'episodeId', 'status', 'type', 'priority'],
  allowedSort: ['createdAt', 'completedAt', 'collectedAt'],
  allowedSearch: [],
  allowedRelations: ['patient', 'doctor', 'episode', 'items'],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 15,
};
