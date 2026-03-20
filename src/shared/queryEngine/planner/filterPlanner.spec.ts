import { describe, it, expect } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { DataSource, EntityMetadata, RelationMetadata, ColumnMetadata } from 'typeorm';
import { JoinPlanner } from './joinPlanner';
import { FilterPlanner } from './filterPlanner';
import { ASTNode, ASTNodeType, ConditionNode, LogicalNode } from '../types/ast.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeColumn(propertyName: string): ColumnMetadata {
  return { propertyName } as unknown as ColumnMetadata;
}

function makeMetadata(
  name: string,
  opts: {
    relations?: Array<{ propertyName: string; inverse: EntityMetadata }>;
    hasDeletedAt?: boolean;
  } = {},
): EntityMetadata {
  const columns: ColumnMetadata[] = [makeColumn('id')];
  if (opts.hasDeletedAt ?? true) columns.push(makeColumn('deletedAt'));

  const relations: RelationMetadata[] = (opts.relations ?? []).map(
    (r) =>
      ({
        propertyName: r.propertyName,
        inverseEntityMetadata: r.inverse,
      }) as unknown as RelationMetadata,
  );

  return { name, columns, relations } as unknown as EntityMetadata;
}

class RootEntity {}

const roleMetadata = makeMetadata('Role', { hasDeletedAt: true });
const deptMetadata = makeMetadata('Department', { hasDeletedAt: true });
const doctorMetadata = makeMetadata('Doctor', {
  hasDeletedAt: true,
  relations: [{ propertyName: 'department', inverse: deptMetadata }],
});
const rootMetadata = makeMetadata('Root', {
  hasDeletedAt: true,
  relations: [
    { propertyName: 'role', inverse: roleMetadata },
    { propertyName: 'doctor', inverse: doctorMetadata },
  ],
});

function makeDataSource(): DataSource {
  const ds = mock<DataSource>();
  ds.getMetadata.mockReturnValue(rootMetadata);
  return ds;
}

function makePlanner(): { joinPlanner: JoinPlanner; filterPlanner: FilterPlanner } {
  const ds = makeDataSource();
  const joinPlanner = new JoinPlanner(ds, RootEntity);
  const filterPlanner = new FilterPlanner(joinPlanner);
  return { joinPlanner, filterPlanner };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FilterPlanner', () => {
  describe('null AST', () => {
    it('returns empty resolvedConditions for null AST', () => {
      const { filterPlanner } = makePlanner();
      const plan = filterPlanner.plan(null);
      expect(plan.resolvedConditions.size).toBe(0);
    });
  });

  describe('root-level condition (no relation)', () => {
    it('resolves alias=root for a root field', () => {
      const { filterPlanner } = makePlanner();
      const node: ConditionNode = {
        type: ASTNodeType.CONDITION,
        field: 'firstName',
        op: 'eq',
        value: 'john',
      };
      const plan = filterPlanner.plan(node);

      expect(plan.resolvedConditions.size).toBe(1);
      expect(plan.resolvedConditions.get(node)).toEqual({ alias: 'root', column: 'firstName' });
    });
  });

  describe('single-level relation condition', () => {
    it('resolves alias=root_role for role.name', () => {
      const { joinPlanner, filterPlanner } = makePlanner();
      const node: ConditionNode = {
        type: ASTNodeType.CONDITION,
        field: 'role.name',
        op: 'eq',
        value: 'admin',
      };
      const plan = filterPlanner.plan(node);

      expect(plan.resolvedConditions.get(node)).toEqual({ alias: 'root_role', column: 'name' });
      expect(joinPlanner.getJoins()).toHaveLength(1);
      expect(joinPlanner.getJoins()[0].alias).toBe('root_role');
    });
  });

  describe('two-level nested relation condition', () => {
    it('resolves alias=root_doctor_department for doctor.department.id', () => {
      const { joinPlanner, filterPlanner } = makePlanner();
      const node: ConditionNode = {
        type: ASTNodeType.CONDITION,
        field: 'doctor.department.id',
        op: 'eq',
        value: '1',
      };
      const plan = filterPlanner.plan(node);

      expect(plan.resolvedConditions.get(node)).toEqual({
        alias: 'root_doctor_department',
        column: 'id',
      });
      expect(joinPlanner.getJoins()).toHaveLength(2); // root_doctor + root_doctor_department
    });
  });

  describe('logical nodes (AND / OR)', () => {
    it('resolves all conditions in an AND node', () => {
      const { filterPlanner } = makePlanner();
      const c1: ConditionNode = {
        type: ASTNodeType.CONDITION,
        field: 'firstName',
        op: 'eq',
        value: 'john',
      };
      const c2: ConditionNode = {
        type: ASTNodeType.CONDITION,
        field: 'role.name',
        op: 'eq',
        value: 'admin',
      };
      const andNode: LogicalNode = { type: ASTNodeType.AND, children: [c1, c2] };
      const plan = filterPlanner.plan(andNode);

      expect(plan.resolvedConditions.size).toBe(2);
      expect(plan.resolvedConditions.get(c1)).toEqual({ alias: 'root', column: 'firstName' });
      expect(plan.resolvedConditions.get(c2)).toEqual({ alias: 'root_role', column: 'name' });
    });

    it('resolves all conditions in a nested OR/AND tree', () => {
      const { filterPlanner } = makePlanner();
      const c1: ConditionNode = {
        type: ASTNodeType.CONDITION,
        field: 'firstName',
        op: 'eq',
        value: 'john',
      };
      const c2: ConditionNode = {
        type: ASTNodeType.CONDITION,
        field: 'role.name',
        op: 'eq',
        value: 'admin',
      };
      const c3: ConditionNode = {
        type: ASTNodeType.CONDITION,
        field: 'doctor.department.id',
        op: 'eq',
        value: '1',
      };
      const inner: LogicalNode = { type: ASTNodeType.AND, children: [c2, c3] };
      const outer: LogicalNode = { type: ASTNodeType.OR, children: [c1, inner] };

      const plan = filterPlanner.plan(outer as unknown as ASTNode);

      expect(plan.resolvedConditions.size).toBe(3);
      expect(plan.resolvedConditions.get(c1)).toEqual({ alias: 'root', column: 'firstName' });
      expect(plan.resolvedConditions.get(c2)).toEqual({ alias: 'root_role', column: 'name' });
      expect(plan.resolvedConditions.get(c3)).toEqual({
        alias: 'root_doctor_department',
        column: 'id',
      });
    });
  });

  describe('shared prefix deduplication via JoinPlanner', () => {
    it('registers role join only once for two conditions on role.*', () => {
      const { joinPlanner, filterPlanner } = makePlanner();
      const c1: ConditionNode = {
        type: ASTNodeType.CONDITION,
        field: 'role.name',
        op: 'eq',
        value: 'admin',
      };
      const c2: ConditionNode = {
        type: ASTNodeType.CONDITION,
        field: 'role.isActive',
        op: 'eq',
        value: 'true',
      };
      const node: LogicalNode = { type: ASTNodeType.AND, children: [c1, c2] };

      filterPlanner.plan(node);

      expect(joinPlanner.getJoins()).toHaveLength(1);
    });
  });

  describe('plan() is stateless across calls', () => {
    it('resets resolved conditions on each plan() call', () => {
      const { filterPlanner } = makePlanner();
      const c1: ConditionNode = {
        type: ASTNodeType.CONDITION,
        field: 'firstName',
        op: 'eq',
        value: 'john',
      };
      const c2: ConditionNode = {
        type: ASTNodeType.CONDITION,
        field: 'lastName',
        op: 'eq',
        value: 'doe',
      };

      const plan1 = filterPlanner.plan(c1);
      expect(plan1.resolvedConditions.size).toBe(1);

      const plan2 = filterPlanner.plan(c2);
      expect(plan2.resolvedConditions.size).toBe(1); // fresh plan, not accumulated
    });
  });
});
