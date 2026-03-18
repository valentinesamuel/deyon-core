export interface AllowedSearchField {
  field: string;
  type: 'fts' | 'tri';
}

export interface ModelQueryConfig {
  allowedFilters: string[];
  allowedSort: string[];
  allowedSearch: AllowedSearchField[];
  allowedRelations: string[];
  allowedFields: string[];
  maxFilters?: number;
  maxJoins?: number;
  maxRelationDepth?: number;
  maxComplexityScore?: number;
  cacheTtlSeconds?: number;
  trigramThreshold?: number;
}

export const MODEL_QUERY_CONFIG_DEFAULTS = {
  maxFilters: 30,
  maxJoins: 8,
  maxRelationDepth: 4,
  maxComplexityScore: 50,
  cacheTtlSeconds: 60,
  trigramThreshold: 0.3,
} as const;
