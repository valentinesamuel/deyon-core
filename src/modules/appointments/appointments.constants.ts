import { Appointment } from '@modules/core/entities/appointment.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const APPOINTMENT_QUERY_CONFIG: EntityQueryConfig<Appointment> = {
  allowedFilters: ['id', 'patientId', 'doctorId', 'status', 'appointmentType'],
  allowedSort: ['scheduleDate', 'createdAt', 'status'],
  allowedSearch: [],
  allowedRelations: ['patient', 'doctor', 'bookedByStaff'],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 10,
};
