import { ServiceCodeCatalog } from '@modules/core/entities/serviceCodeCatalog.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const SERVICE_CODE_CATALOG_QUERY_CONFIG: EntityQueryConfig<ServiceCodeCatalog> = {
  allowedFilters: ['id', 'serviceId', 'medicalCodeId', 'hmoProviderId'],
  allowedSort: ['createdAt'],
  allowedSearch: [],
  allowedRelations: [],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};
