import { HmoProvider } from '@modules/core/entities/hmoProvider.entity';
import { HmoContract } from '@modules/core/entities/hmoContract.entity';
import { HmoRules } from '@modules/core/entities/hmoRules.entity';
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

export const HMO_CONTRACT_QUERY_CONFIG: EntityQueryConfig<HmoContract> = {
  allowedFilters: ['id', 'hmoProviderId', 'serviceId', 'coverageType', 'isActive'],
  allowedSort: ['createdAt'],
  allowedSearch: [],
  allowedRelations: [],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};

export const HMO_RULES_QUERY_CONFIG: EntityQueryConfig<HmoRules> = {
  allowedFilters: ['id', 'hmoProviderId', 'triggerServiceId'],
  allowedSort: ['createdAt'],
  allowedSearch: [],
  allowedRelations: [],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};
