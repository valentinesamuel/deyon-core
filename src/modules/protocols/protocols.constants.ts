import { ProtocolBundle } from '@modules/core/entities/protocolBundles.entity';
import { EntityQueryConfig } from '@shared/queryEngine';

export const PROTOCOL_BUNDLE_QUERY_CONFIG: EntityQueryConfig<ProtocolBundle> = {
  allowedFilters: ['id', 'medicalCodeId', 'name'],
  allowedSort: ['name', 'createdAt'],
  allowedSearch: [{ field: 'name', type: 'fts' }],
  allowedRelations: [],
  allowedFields: [],
  maxRelationDepth: 2,
  cacheTtlSeconds: 30,
};
