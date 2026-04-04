import { LabReferral } from '@modules/core/entities/labReferral.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const LAB_REFERRAL_QUERY_CONFIG: EntityQueryConfig<LabReferral> = {
  allowedFilters: ['id', 'status', 'direction', 'patientId', 'partnerLabId', 'referredBy'],
  allowedSort: ['createdAt', 'priority'],
  allowedSearch: [
    { field: 'referenceNumber', type: 'fts' },
    { field: 'trackingId', type: 'fts' },
  ],
  allowedRelations: ['patient', 'partnerLab', 'referredByStaff', 'items'],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 10,
};
