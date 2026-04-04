import { PartnerLab } from '@modules/core/entities/partnerLab.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const PARTNER_LAB_QUERY_CONFIG: EntityQueryConfig<PartnerLab> = {
  allowedFilters: ['id', 'code', 'status'],
  allowedSort: ['name', 'code', 'createdAt'],
  allowedSearch: [{ field: 'code', type: 'fts' }],
  allowedRelations: [],
  allowedFields: [],
  maxRelationDepth: 1,
  cacheTtlSeconds: 30,
};
