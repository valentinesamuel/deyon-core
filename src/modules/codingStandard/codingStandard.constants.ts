import { CodingStandard } from '@modules/core/entities/codingStandard.entity';
import { MedicalCode } from '@modules/core/entities/medicalCode.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const CODING_STANDARD_QUERY_CONFIG: EntityQueryConfig<CodingStandard> = {
  allowedFilters: ['id', 'name'],
  allowedSort: ['name', 'createdAt'],
  allowedSearch: [{ field: 'name', type: 'fts' }],
  allowedRelations: [],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};

export const MEDICAL_CODE_QUERY_CONFIG: EntityQueryConfig<MedicalCode> = {
  allowedFilters: ['id', 'standardId', 'codeValue'],
  allowedSort: ['codeValue', 'createdAt'],
  allowedSearch: [{ field: 'codeValue', type: 'fts' }],
  allowedRelations: [],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};
