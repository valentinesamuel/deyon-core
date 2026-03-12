/**
 * Generates dot-notation key paths up to 2 levels deep.
 * Handles plain objects and arrays (OneToMany relations).
 * Examples for Staff: 'firstName' | 'role.name' | 'department.alias'
 */
export type DeepKeyOf<T> =
  | (keyof T & string)
  | {
      [K in keyof T & string]: T[K] extends Array<infer U>
        ? U extends object
          ? `${K}.${keyof U & string}`
          : never
        : T[K] extends object
          ? `${K}.${keyof T[K] & string}`
          : never;
    }[keyof T & string];

export interface TypedSearchField<T> {
  field: DeepKeyOf<T>;
  type: 'fts' | 'tri';
}

/**
 * Typed version of ModelQueryConfig. Structurally identical
 * except arrays are constrained to DeepKeyOf<T> for autocomplete.
 * Compatible with ModelQueryConfig — no cast needed.
 */
export interface EntityQueryConfig<T> {
  allowedFilters: Array<DeepKeyOf<T>>;
  allowedSort: Array<DeepKeyOf<T>>;
  allowedSearch: Array<TypedSearchField<T>>;
  allowedRelations: string[];
  allowedFields: Array<DeepKeyOf<T>>;
  maxFilters?: number;
  maxJoins?: number;
  maxRelationDepth?: number;
  maxComplexityScore?: number;
  cacheTtlSeconds?: number;
  trigramThreshold?: number;
}
