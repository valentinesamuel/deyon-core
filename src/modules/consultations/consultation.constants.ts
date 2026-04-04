import { Consultation } from '@modules/core/entities/consultation.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const CONSULTATION_QUERY_CONFIG: EntityQueryConfig<Consultation> = {
  allowedFilters: ['id', 'episodeId', 'patientId', 'doctorId', 'status', 'appointmentId'],
  allowedSort: ['createdAt', 'startedAt', 'finalizedAt'],
  allowedSearch: [],
  allowedRelations: ['patient', 'doctor', 'episode', 'appointment'],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 15,
};
