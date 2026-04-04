import { Claim } from '@modules/core/entities/claim.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const CLAIM_QUERY_CONFIG: EntityQueryConfig<Claim> = {
  allowedFilters: ['id', 'status', 'episodeId', 'hmoProviderId'],
  allowedSort: ['createdAt', 'totalBilledAmount', 'approvedAmount'],
  allowedSearch: [
    { field: 'claimNumber', type: 'fts' },
    { field: 'policyNumber', type: 'fts' },
    { field: 'enrollmentId', type: 'fts' },
  ],
  allowedRelations: ['episode', 'hmoProvider', 'claimItems', 'bills'],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 10,
};
