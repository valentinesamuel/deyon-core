import { QueueEntry } from '@modules/core/entities/queueEntry.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const QUEUE_QUERY_CONFIG: EntityQueryConfig<QueueEntry> = {
  allowedFilters: ['id', 'patientId', 'episodeId', 'queueType', 'priority', 'paymentStatus'],
  allowedSort: ['enteredAt', 'priority', 'createdAt'],
  allowedSearch: [],
  allowedRelations: ['patient', 'episode', 'assignedStaff'],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 5,
};
