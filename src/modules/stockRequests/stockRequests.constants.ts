import { RestockRequest } from '@modules/core/entities/restockRequest.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const STOCK_REQUEST_QUERY_CONFIG: EntityQueryConfig<RestockRequest> = {
  allowedFilters: ['id', 'status', 'urgency', 'requestedBy'],
  allowedSort: ['createdAt', 'urgency'],
  allowedSearch: [{ field: 'reason', type: 'fts' }],
  allowedRelations: ['requestedByStaff', 'items'],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 10,
};
