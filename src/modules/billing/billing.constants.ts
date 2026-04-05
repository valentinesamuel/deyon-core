import { Bill } from '@modules/core/entities/bill.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const BILL_QUERY_CONFIG: EntityQueryConfig<Bill> = {
  allowedFilters: ['id', 'patientId', 'status', 'type', 'departmentId', 'episodeId', 'isWalkIn'],
  allowedSort: ['createdAt', 'paidAt', 'total'],
  allowedSearch: [{ field: 'billNumber', type: 'fts' }],
  allowedRelations: ['patient', 'department', 'items', 'payments'],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 10,
};

/** Billing code expiry in hours */
export const BILLING_CODE_EXPIRY_HOURS = 6;
