import { MedicalServiceCategory } from '@modules/core/entities/medicalServiceCategory.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const MEDICAL_SERVICE_CATEGORY_QUERY_CONFIG: EntityQueryConfig<MedicalServiceCategory> = {
  allowedFilters: ['id', 'name'],
  allowedSort: ['name', 'createdAt'],
  allowedSearch: [{ field: 'name', type: 'fts' }],
  allowedRelations: [],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};
