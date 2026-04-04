import { Supplier } from '@modules/core/entities/supplier.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const SUPPLIER_QUERY_CONFIG: EntityQueryConfig<Supplier> = {
  allowedFilters: ['id', 'name', 'isActive', 'contactEmail'],
  allowedSort: ['name', 'createdAt'],
  allowedSearch: [{ field: 'name', type: 'fts' }],
  allowedRelations: [],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};
