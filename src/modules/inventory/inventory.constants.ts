import { Inventory } from '@modules/core/entities/inventory.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const INVENTORY_QUERY_CONFIG: EntityQueryConfig<Inventory> = {
  allowedFilters: ['id', 'categoryId', 'supplierId', 'name', 'unit'],
  allowedSort: ['name', 'createdAt', 'currentStock'],
  allowedSearch: [{ field: 'name', type: 'fts' }],
  allowedRelations: [],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};
