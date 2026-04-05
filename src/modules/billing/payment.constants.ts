import { Payment } from '@modules/core/entities/payment.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const PAYMENT_QUERY_CONFIG: EntityQueryConfig<Payment> = {
  allowedFilters: ['id', 'billId', 'patientId', 'paymentMethod', 'type', 'shiftId'],
  allowedSort: ['createdAt', 'amount'],
  allowedSearch: [{ field: 'receiptNumber', type: 'fts' }],
  allowedRelations: ['bill', 'patient', 'staff'],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 10,
};
