import { Department } from '@modules/core/entities/department.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const DEPARTMENT_QUERY_CONFIG: EntityQueryConfig<Department> = {
  allowedFilters: ['id', 'name', 'alias'],
  allowedSort: ['name', 'createdAt'],
  allowedSearch: [{ field: 'name', type: 'fts' }],
  allowedRelations: [],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};
