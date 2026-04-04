import { TestCatalog } from '@modules/core/entities/testCatalog.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const TEST_CATALOG_QUERY_CONFIG: EntityQueryConfig<TestCatalog> = {
  allowedFilters: ['id', 'code', 'serviceCodeId', 'sampleType'],
  allowedSort: ['name', 'code', 'createdAt'],
  allowedSearch: [{ field: 'name', type: 'fts' }],
  allowedRelations: [],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};
