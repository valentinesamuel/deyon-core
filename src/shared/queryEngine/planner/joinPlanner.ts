import { DataSource, EntityMetadata, EntityTarget } from 'typeorm';

export class JoinPlannerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JoinPlannerError';
  }
}

export interface JoinSpec {
  type: 'LEFT';
  parentAlias: string;
  relationProperty: string; // TypeORM entity property name (camelCase)
  alias: string; // e.g. 'root_doctor_department'
  depth: number;
  hasDeletedAt: boolean; // whether to add AND alias.deleted_at IS NULL on JOIN
  isInclude: boolean; // whether this join was registered via include= (needs SELECT)
}

export class JoinPlanner {
  private readonly joins: Map<string, JoinSpec> = new Map();
  private readonly pathToAlias: Map<string, string> = new Map();
  private readonly aliasToMetadata: Map<string, EntityMetadata> = new Map();

  constructor(
    private readonly dataSource: DataSource,
    private readonly rootEntityClass: EntityTarget<object>,
    private readonly maxJoins: number = 8,
  ) {}

  /**
   * Register a single hop in the relation chain at index `i` of `parts`.
   * Returns the new alias and metadata for the registered relation, or the
   * existing ones if the hop was already registered.
   */
  private registerSingleHop(
    parts: string[],
    i: number,
    isInclude: boolean,
    currentMetadata: EntityMetadata,
    currentAlias: string,
  ): { alias: string; metadata: EntityMetadata } {
    const relationName = parts[i];
    const pathSoFar = parts.slice(0, i + 1).join('.');
    const newAlias = 'root_' + parts.slice(0, i + 1).join('_');

    if (!this.pathToAlias.has(pathSoFar)) {
      const relation = currentMetadata.relations.find((r) => r.propertyName === relationName);
      if (!relation) {
        throw new JoinPlannerError(
          `Relation "${relationName}" not found on entity "${currentMetadata.name}"`,
        );
      }

      const targetMetadata = relation.inverseEntityMetadata;
      const hasDeletedAt = targetMetadata.columns.some((c) => c.propertyName === 'deletedAt');

      if (this.joins.size >= this.maxJoins) {
        throw new JoinPlannerError(`Maximum join limit of ${this.maxJoins} exceeded`);
      }

      const joinSpec: JoinSpec = {
        type: 'LEFT',
        parentAlias: currentAlias,
        relationProperty: relationName,
        alias: newAlias,
        depth: i + 1,
        hasDeletedAt,
        isInclude,
      };

      this.joins.set(newAlias, joinSpec);
      this.pathToAlias.set(pathSoFar, newAlias);
      this.aliasToMetadata.set(newAlias, targetMetadata);
      return { alias: newAlias, metadata: targetMetadata };
    }

    // Join already registered — upgrade isInclude if this call is for an include= path
    if (isInclude) {
      const existing = this.joins.get(newAlias);
      if (existing) existing.isInclude = true;
    }
    return { alias: newAlias, metadata: this.aliasToMetadata.get(newAlias)! };
  }

  /**
   * Internal: walk a chain of relation names, registering joins for each.
   * Returns the alias and metadata of the last registered relation.
   */
  private registerRelationChain(
    parts: string[],
    isInclude: boolean = false,
  ): { alias: string; metadata: EntityMetadata } {
    let currentMetadata = this.dataSource.getMetadata(this.rootEntityClass);
    let currentAlias = 'root';

    for (let i = 0; i < parts.length; i++) {
      const result = this.registerSingleHop(parts, i, isInclude, currentMetadata, currentAlias);
      currentMetadata = result.metadata;
      currentAlias = result.alias;
    }

    return { alias: currentAlias, metadata: currentMetadata };
  }

  /**
   * Register joins for a dotted field path where the last segment is a column.
   * e.g. "doctor.department.name" → registers root_doctor + root_doctor_department joins,
   * returns { alias: 'root_doctor_department', column: 'name' }.
   * For a root field like "firstName", returns { alias: 'root', column: 'firstName' }.
   */
  registerPath(path: string): { alias: string; column: string } {
    const parts = path.split('.');
    const column = parts.at(-1)!;
    const relationParts = parts.slice(0, -1);

    if (relationParts.length === 0) {
      return { alias: 'root', column };
    }

    const { alias } = this.registerRelationChain(relationParts);
    return { alias, column };
  }

  /**
   * Register joins for an include= path where every segment is a relation.
   * e.g. "role.permissions" → registers root_role + root_role_permissions joins,
   * returns the alias of the leaf relation.
   */
  registerInclude(path: string): string {
    const parts = path.split('.');
    const { alias } = this.registerRelationChain(parts, true);
    return alias;
  }

  /**
   * Return all registered joins sorted by depth (shallowest first).
   */
  getJoins(): JoinSpec[] {
    return Array.from(this.joins.values()).sort((a, b) => a.depth - b.depth);
  }

  getAliasForPath(relationPath: string): string | undefined {
    return this.pathToAlias.get(relationPath);
  }
}
