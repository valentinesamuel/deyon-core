import { MedicalService } from '@modules/core/entities/medicalService.entity';
import { PriceChange } from '@modules/core/entities/priceChange.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const MEDICAL_SERVICE_QUERY_CONFIG: EntityQueryConfig<MedicalService> = {
  allowedFilters: ['id', 'code', 'status', 'isActive', 'medicalServiceCategoryId', 'department'],
  allowedSort: ['name', 'code', 'createdAt'],
  allowedSearch: [{ field: 'name', type: 'fts' }],
  allowedRelations: ['medicalServiceCategory'],
  allowedFields: [
    'code',
    'name',
    'description',
    'medicalServiceCategoryId',
    'medicalServiceCategory.name',
    'defaultPrice',
    'isTaxable',
    'isPremium',
    'isRestricted',
    'restrictionReason',
    'department',
    'status',
    'isActive',
  ],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};

export const PRICE_CHANGE_QUERY_CONFIG: EntityQueryConfig<PriceChange> = {
  allowedFilters: ['id', 'serviceId', 'status', 'requestedBy'],
  allowedSort: ['createdAt'],
  allowedSearch: [],
  allowedRelations: [],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};
