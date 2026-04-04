import { Patient } from '@modules/core/entities/patient.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const PATIENT_QUERY_CONFIG: EntityQueryConfig<Patient> = {
  allowedFilters: ['id', 'mrn', 'gender', 'paymentType', 'isActive', 'lgaId'],
  allowedSort: ['createdAt', 'firstname', 'lastname', 'mrn'],
  allowedSearch: [
    { field: 'firstname', type: 'fts' },
    { field: 'lastname', type: 'fts' },
    { field: 'mrn', type: 'fts' },
    { field: 'phoneNumber', type: 'fts' },
  ],
  allowedRelations: ['lga'],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};
