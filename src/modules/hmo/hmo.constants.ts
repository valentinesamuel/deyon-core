import { HmoProvider } from '@modules/core/entities/hmoProvider.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const HMO_PROVIDER_QUERY_CONFIG: EntityQueryConfig<HmoProvider> = {
  allowedFilters: ['id', 'code', 'contactPhone', 'contactEmail', 'address', 'defaultCopay'],
  allowedSort: ['code', 'name'],
  allowedSearch: [{ field: 'code', type: 'fts' }],
  allowedRelations: ['role', 'department'],
  allowedFields: ['id'],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};
