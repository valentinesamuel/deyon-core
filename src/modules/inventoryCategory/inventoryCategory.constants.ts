import { InventoryCategory } from '@modules/core/entities/inventoryCategory.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const INVENTORY_CATEGORY_QUERY_CONFIG: EntityQueryConfig<InventoryCategory> = {
  allowedFilters: ['id', 'name'],
  allowedSort: ['name', 'createdAt'],
  allowedSearch: [{ field: 'name', type: 'fts' }],
  allowedRelations: [],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};
