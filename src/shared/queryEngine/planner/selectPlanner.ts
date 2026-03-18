export interface SelectPlan {
  /**
   * alias → column property names to select.
   * An empty array means "select all columns" for that alias.
   * Aliases absent from this map also select all columns.
   */
  columns: Map<string, string[]>;
}

/**
 * Processes fields[entityAlias]=col1,col2 (from ParsedQuery.fields) into a
 * per-alias column map. Always ensures 'id' is included for FK integrity
 * when explicit column lists are provided.
 *
 * include= aliases are NOT added here — their absence from the map means
 * the query builder will select all columns for those joins.
 */
export class SelectPlanner {
  plan(fields: Record<string, string[]>): SelectPlan {
    const columns = new Map<string, string[]>();

    for (const [alias, cols] of Object.entries(fields)) {
      const colSet = new Set(cols);
      colSet.add('id'); // always include id for FK integrity
      columns.set(alias, Array.from(colSet));
    }

    return { columns };
  }
}
