import { Prescription } from '@modules/core/entities/prescription.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const PRESCRIPTION_QUERY_CONFIG: EntityQueryConfig<Prescription> = {
  allowedFilters: ['id', 'patientId', 'doctorId', 'status', 'dispensedBy'],
  allowedSort: ['createdAt', 'dispensedAt'],
  allowedSearch: [],
  allowedRelations: ['patient', 'doctor', 'items'],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 15,
};
