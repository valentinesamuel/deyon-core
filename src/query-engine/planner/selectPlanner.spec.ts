import { describe, it, expect } from 'vitest';
import { SelectPlanner } from './selectPlanner';

describe('SelectPlanner', () => {
  const planner = new SelectPlanner();

  describe('empty fields', () => {
    it('returns empty columns map when no fields are specified', () => {
      const plan = planner.plan({});
      expect(plan.columns.size).toBe(0);
    });
  });

  describe('single alias', () => {
    it('includes specified columns plus id for FK integrity', () => {
      const plan = planner.plan({ root: ['firstName', 'lastName'] });

      expect(plan.columns.has('root')).toBe(true);
      const cols = plan.columns.get('root')!;
      expect(cols).toContain('firstName');
      expect(cols).toContain('lastName');
      expect(cols).toContain('id');
    });

    it('does not duplicate id when id is already in the list', () => {
      const plan = planner.plan({ root: ['id', 'name'] });
      const cols = plan.columns.get('root')!;
      const idCount = cols.filter((c) => c === 'id').length;
      expect(idCount).toBe(1);
    });
  });

  describe('multiple aliases', () => {
    it('handles multiple aliases independently', () => {
      const plan = planner.plan({
        root: ['firstName'],
        root_role: ['name', 'isActive'],
      });

      expect(plan.columns.size).toBe(2);

      expect(plan.columns.get('root')).toContain('firstName');
      expect(plan.columns.get('root')).toContain('id');

      expect(plan.columns.get('root_role')).toContain('name');
      expect(plan.columns.get('root_role')).toContain('isActive');
      expect(plan.columns.get('root_role')).toContain('id');
    });
  });

  describe('include= aliases not restricted', () => {
    it('aliases not present in fields are absent from the columns map (select all)', () => {
      const plan = planner.plan({ root: ['firstName'] });
      // root_role was joined via include= but not in fields — should NOT appear
      expect(plan.columns.has('root_role')).toBe(false);
    });
  });

  describe('single column field list', () => {
    it('always adds id even when only one other column is given', () => {
      const plan = planner.plan({ root: ['email'] });
      const cols = plan.columns.get('root')!;
      expect(cols).toEqual(expect.arrayContaining(['email', 'id']));
    });
  });

  describe('only id specified', () => {
    it('returns only id (no duplicate) when fields=[id]', () => {
      const plan = planner.plan({ root: ['id'] });
      const cols = plan.columns.get('root')!;
      expect(cols).toHaveLength(1);
      expect(cols[0]).toBe('id');
    });
  });
});
