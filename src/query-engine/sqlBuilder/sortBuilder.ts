import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { SortField } from '../types/query.types';
import { JoinPlanner } from '../planner/joinPlanner';

/**
 * Resolves sort fields to their alias.column pairs via JoinPlanner
 * and applies them to the query builder.
 *
 * sort=-date,doctor.name → DESC root.date, ASC root_doctor.name
 */
export class SortBuilder {
  apply<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    sortFields: SortField[],
    joinPlanner: JoinPlanner,
  ): void {
    let first = true;
    for (const sf of sortFields) {
      const { alias, column } = joinPlanner.registerPath(sf.field);
      const expression = `${alias}.${column}`;

      if (first) {
        qb.orderBy(expression, sf.dir);
        first = false;
      } else {
        qb.addOrderBy(expression, sf.dir);
      }
    }
  }

  /**
   * Parse a sort= string into SortField[].
   * Format: "field,-field2,relation.field3"
   * Prefix "-" means DESC; no prefix means ASC.
   */
  static parse(sortStr: string): SortField[] {
    if (!sortStr || sortStr.trim() === '') return [];
    return sortStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        if (s.startsWith('-')) {
          return { field: s.slice(1), dir: 'DESC' as const };
        }
        return { field: s, dir: 'ASC' as const };
      });
  }
}
