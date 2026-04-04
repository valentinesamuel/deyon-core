import { describe, it, expect, beforeEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { DataSource, EntityMetadata } from 'typeorm';
import { JoinPlanner, JoinPlannerError } from './joinPlanner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeColumn(propertyName: string): any {
  return { propertyName };
}

function makeMetadata(
  name: string,
  opts: {
    relations?: Array<{ propertyName: string; inverse: EntityMetadata }>;
    hasDeletedAt?: boolean;
  } = {},
): EntityMetadata {
  const columns: any[] = [makeColumn('id')];
  if (opts.hasDeletedAt ?? true) columns.push(makeColumn('deletedAt'));

  const relations: any[] = (opts.relations ?? []).map((r) => ({
    propertyName: r.propertyName,
    inverseEntityMetadata: r.inverse,
  }));

  return { name, columns, relations } as unknown as EntityMetadata;
}

// ─── Fixture entities (dummy classes for type-safe metadata lookup) ───────────

class RootEntity {}

// ─── Build a 4-level deep chain: Root → A → B → C → D ───────────────────────

const dMetadata = makeMetadata('D', { hasDeletedAt: true });
const cMetadata = makeMetadata('C', {
  hasDeletedAt: true,
  relations: [{ propertyName: 'd', inverse: dMetadata }],
});
const bMetadata = makeMetadata('B', {
  hasDeletedAt: false,
  relations: [{ propertyName: 'c', inverse: cMetadata }],
});
const aMetadata = makeMetadata('A', {
  hasDeletedAt: true,
  relations: [{ propertyName: 'b', inverse: bMetadata }],
});
const rootMetadata = makeMetadata('Root', {
  hasDeletedAt: true,
  relations: [
    { propertyName: 'a', inverse: aMetadata },
    { propertyName: 'role', inverse: makeMetadata('Role', { hasDeletedAt: true }) },
    {
      propertyName: 'doctor',
      inverse: makeMetadata('Doctor', {
        hasDeletedAt: true,
        relations: [
          {
            propertyName: 'department',
            inverse: makeMetadata('Department', { hasDeletedAt: true }),
          },
        ],
      }),
    },
  ],
});

function makeDataSource(): DataSource {
  const ds = mock<DataSource>();
  ds.getMetadata.mockReturnValue(rootMetadata);
  return ds;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('JoinPlanner', () => {
  let ds: DataSource;

  beforeEach(() => {
    ds = makeDataSource();
  });

  describe('registerPath — root field (no relation)', () => {
    it('returns alias=root for a field with no dot', () => {
      const planner = new JoinPlanner(ds, RootEntity);
      const result = planner.registerPath('firstName');
      expect(result).toEqual({ alias: 'root', column: 'firstName' });
      expect(planner.getJoins()).toHaveLength(0);
    });
  });

  describe('registerPath — single-level join', () => {
    it('registers root_role join for role.name', () => {
      const planner = new JoinPlanner(ds, RootEntity);
      const result = planner.registerPath('role.name');

      expect(result).toEqual({ alias: 'root_role', column: 'name' });

      const joins = planner.getJoins();
      expect(joins).toHaveLength(1);
      expect(joins[0]).toMatchObject({
        type: 'LEFT',
        parentAlias: 'root',
        relationProperty: 'role',
        alias: 'root_role',
        depth: 1,
        hasDeletedAt: true,
      });
    });
  });

  describe('registerPath — 4-level deep join', () => {
    it('registers 4 joins for a.b.c.d.col', () => {
      const planner = new JoinPlanner(ds, RootEntity);
      const result = planner.registerPath('a.b.c.d.col');

      expect(result).toEqual({ alias: 'root_a_b_c_d', column: 'col' });

      const joins = planner.getJoins();
      expect(joins).toHaveLength(4);

      expect(joins[0]).toMatchObject({
        alias: 'root_a',
        parentAlias: 'root',
        depth: 1,
        hasDeletedAt: true,
      });
      expect(joins[1]).toMatchObject({
        alias: 'root_a_b',
        parentAlias: 'root_a',
        depth: 2,
        hasDeletedAt: false,
      });
      expect(joins[2]).toMatchObject({
        alias: 'root_a_b_c',
        parentAlias: 'root_a_b',
        depth: 3,
        hasDeletedAt: true,
      });
      expect(joins[3]).toMatchObject({
        alias: 'root_a_b_c_d',
        parentAlias: 'root_a_b_c',
        depth: 4,
        hasDeletedAt: true,
      });
    });

    it('returns joins sorted by depth (shallowest first)', () => {
      const planner = new JoinPlanner(ds, RootEntity);
      planner.registerPath('a.b.c.d.col');
      const depths = planner.getJoins().map((j) => j.depth);
      expect(depths).toEqual([1, 2, 3, 4]);
    });
  });

  describe('shared prefix deduplication', () => {
    it('registers only one root_doctor join for doctor.name + doctor.firstName', () => {
      const planner = new JoinPlanner(ds, RootEntity);
      planner.registerPath('doctor.name');
      planner.registerPath('doctor.firstName');

      const joins = planner.getJoins();
      expect(joins).toHaveLength(1);
      expect(joins[0].alias).toBe('root_doctor');
    });

    it('registers root_doctor once for doctor.name + doctor.department.id', () => {
      const planner = new JoinPlanner(ds, RootEntity);
      planner.registerPath('doctor.name');
      planner.registerPath('doctor.department.id');

      const joins = planner.getJoins();
      expect(joins).toHaveLength(2);
      expect(joins[0].alias).toBe('root_doctor');
      expect(joins[1].alias).toBe('root_doctor_department');
    });

    it('registers both aliases only once when called in reverse order', () => {
      const planner = new JoinPlanner(ds, RootEntity);
      planner.registerPath('doctor.department.id');
      planner.registerPath('doctor.name'); // doctor already registered

      const joins = planner.getJoins();
      expect(joins).toHaveLength(2); // root_doctor + root_doctor_department, no duplicates
    });
  });

  describe('join limit enforcement', () => {
    it('throws JoinPlannerError when max joins exceeded', () => {
      const planner = new JoinPlanner(ds, RootEntity, 1); // allow only 1 join
      planner.registerPath('role.name'); // OK — registers root_role

      // Second join attempt must throw
      expect(() => planner.registerPath('doctor.name')).toThrow(JoinPlannerError);
      expect(() => planner.registerPath('doctor.name')).toThrow('Maximum join limit of 1 exceeded');
    });

    it('does not count re-registration of an existing join against the limit', () => {
      const planner = new JoinPlanner(ds, RootEntity, 1);
      planner.registerPath('role.name');

      // Registering role.isActive reuses root_role — should NOT throw
      expect(() => planner.registerPath('role.isActive')).not.toThrow();
    });
  });

  describe('registerInclude', () => {
    it('registers a single relation join for include=role', () => {
      const planner = new JoinPlanner(ds, RootEntity);
      const alias = planner.registerInclude('role');

      expect(alias).toBe('root_role');
      expect(planner.getJoins()).toHaveLength(1);
    });

    it('registers nested joins for include=doctor.department', () => {
      const planner = new JoinPlanner(ds, RootEntity);
      const alias = planner.registerInclude('doctor.department');

      expect(alias).toBe('root_doctor_department');
      expect(planner.getJoins()).toHaveLength(2);
    });

    it('sets isInclude=true on joins registered via registerInclude()', () => {
      const planner = new JoinPlanner(ds, RootEntity);
      planner.registerInclude('role');

      const joins = planner.getJoins();
      expect(joins).toHaveLength(1);
      expect(joins[0].isInclude).toBe(true);
    });

    it('sets isInclude=false on joins registered via registerPath()', () => {
      const planner = new JoinPlanner(ds, RootEntity);
      planner.registerPath('role.name');

      const joins = planner.getJoins();
      expect(joins).toHaveLength(1);
      expect(joins[0].isInclude).toBe(false);
    });

    it('marks both segments isInclude=true for nested include=doctor.department', () => {
      const planner = new JoinPlanner(ds, RootEntity);
      planner.registerInclude('doctor.department');

      const joins = planner.getJoins();
      expect(joins).toHaveLength(2);
      expect(joins[0]).toMatchObject({ alias: 'root_doctor', isInclude: true });
      expect(joins[1]).toMatchObject({ alias: 'root_doctor_department', isInclude: true });
    });

    it('upgrades isInclude to true when registerInclude is called after registerPath for the same relation', () => {
      const planner = new JoinPlanner(ds, RootEntity);
      planner.registerPath('role.name'); // registers root_role with isInclude=false
      planner.registerInclude('role'); // should upgrade root_role to isInclude=true

      const joins = planner.getJoins();
      expect(joins).toHaveLength(1);
      expect(joins[0]).toMatchObject({ alias: 'root_role', isInclude: true });
    });
  });

  describe('unknown relation', () => {
    it('throws JoinPlannerError for a relation that does not exist on the entity', () => {
      const planner = new JoinPlanner(ds, RootEntity);
      expect(() => planner.registerPath('nonExistent.col')).toThrow(JoinPlannerError);
      expect(() => planner.registerPath('nonExistent.col')).toThrow(
        'Relation "nonExistent" not found on entity "Root"',
      );
    });
  });

  describe('getAliasForPath', () => {
    it('returns the alias for a registered relation path', () => {
      const planner = new JoinPlanner(ds, RootEntity);
      planner.registerPath('doctor.name');
      expect(planner.getAliasForPath('doctor')).toBe('root_doctor');
    });

    it('returns undefined for an unregistered path', () => {
      const planner = new JoinPlanner(ds, RootEntity);
      expect(planner.getAliasForPath('doctor')).toBeUndefined();
    });
  });
});
