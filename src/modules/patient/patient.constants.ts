import { Patient } from '@modules/core/entities/patient.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const PATIENT_QUERY_CONFIG: EntityQueryConfig<Patient> = {
  allowedFilters: ['id', 'mrn', 'gender', 'paymentType', 'isActive', 'lgaId'],
  allowedSort: ['createdAt', 'firstname', 'lastname', 'mrn'],
  allowedSearch: ['firstname', 'lastname', 'mrn', 'phoneNumber'],
  allowedRelations: ['lga'],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};
