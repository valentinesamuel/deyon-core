import { describe, it, expect, beforeEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { SelectQueryBuilder } from 'typeorm';
import { AggregationBuilder } from './aggregationBuilder';
import { JoinPlanner } from '../planner/joinPlanner';
import { parseWhereClause } from '../parser/parser';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQb() {
  const qb = mock<SelectQueryBuilder<any>>();
  qb.groupBy.mockReturnThis();
  qb.addGroupBy.mockReturnThis();
  qb.addSelect.mockReturnThis();
  qb.andHaving.mockReturnThis();
  qb.having.mockReturnThis();
  qb.orHaving.mockReturnThis();
  return qb;
}

function makePlanner(mapping: Record<string, { alias: string; column: string }>) {
  const planner = mock<JoinPlanner>();
  planner.registerPath.mockImplementation((path: string) => {
    if (mapping[path]) return mapping[path];
    return { alias: 'root', column: path };
  });
  return planner;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AggregationBuilder', () => {
  let builder: AggregationBuilder;

  beforeEach(() => {
    builder = new AggregationBuilder();
  });

  // -------------------------------------------------------------------------
  // GROUP BY
  // -------------------------------------------------------------------------

  describe('GROUP BY', () => {
    it('applies single root-level groupBy', () => {
      const qb = makeQb();
      const planner = makePlanner({ status: { alias: 'root', column: 'status' } });

      builder.apply(qb, ['status'], [], null, planner);

      expect(qb.groupBy).toHaveBeenCalledWith('root.status');
      expect(qb.addGroupBy).not.toHaveBeenCalled();
    });

    it('applies multiple groupBy with first via groupBy and rest via addGroupBy', () => {
      const qb = makeQb();
      const planner = makePlanner({
        status: { alias: 'root', column: 'status' },
        'department.id': { alias: 'root_department', column: 'id' },
      });

      builder.apply(qb, ['status', 'department.id'], [], null, planner);

      expect(qb.groupBy).toHaveBeenCalledWith('root.status');
      expect(qb.addGroupBy).toHaveBeenCalledWith('root_department.id');
    });

    it('registers joins for nested groupBy field', () => {
      const qb = makeQb();
      const planner = makePlanner({
        'doctor.department.id': { alias: 'root_doctor_department', column: 'id' },
      });

      builder.apply(qb, ['doctor.department.id'], [], null, planner);

      expect(planner.registerPath).toHaveBeenCalledWith('doctor.department.id');
      expect(qb.groupBy).toHaveBeenCalledWith('root_doctor_department.id');
    });
  });

  // -------------------------------------------------------------------------
  // Aggregate SELECTs
  // -------------------------------------------------------------------------

  describe('aggregate SELECTs', () => {
    it('adds COUNT select', () => {
      const qb = makeQb();
      const planner = makePlanner({ id: { alias: 'root', column: 'id' } });

      builder.apply(qb, [], [{ fn: 'count', field: 'id' }], null, planner);

      expect(qb.addSelect).toHaveBeenCalledWith('COUNT(root.id)', 'count_id');
    });

    it('adds AVG select', () => {
      const qb = makeQb();
      const planner = makePlanner({ salary: { alias: 'root', column: 'salary' } });

      builder.apply(qb, [], [{ fn: 'avg', field: 'salary' }], null, planner);

      expect(qb.addSelect).toHaveBeenCalledWith('AVG(root.salary)', 'avg_salary');
    });

    it('adds multiple aggregate selects', () => {
      const qb = makeQb();
      const planner = makePlanner({
        id: { alias: 'root', column: 'id' },
        salary: { alias: 'root', column: 'salary' },
      });

      builder.apply(
        qb,
        [],
        [
          { fn: 'count', field: 'id' },
          { fn: 'avg', field: 'salary' },
        ],
        null,
        planner,
      );

      expect(qb.addSelect).toHaveBeenCalledTimes(2);
      expect(qb.addSelect).toHaveBeenCalledWith('COUNT(root.id)', 'count_id');
      expect(qb.addSelect).toHaveBeenCalledWith('AVG(root.salary)', 'avg_salary');
    });

    it('skips unknown aggregate function', () => {
      const qb = makeQb();
      const planner = makePlanner({ id: { alias: 'root', column: 'id' } });

      builder.apply(qb, [], [{ fn: 'unknown_fn', field: 'id' }], null, planner);

      expect(qb.addSelect).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // HAVING
  // -------------------------------------------------------------------------

  describe('HAVING', () => {
    it('does nothing when havingAst is null', () => {
      const qb = makeQb();
      const planner = makePlanner({});

      builder.apply(qb, [], [], null, planner);

      expect(qb.andHaving).not.toHaveBeenCalled();
    });

    it('applies simple AGGREGATE having condition: COUNT(id) > 5', () => {
      const qb = makeQb();
      const planner = makePlanner({ id: { alias: 'root', column: 'id' } });

      const havingAst = parseWhereClause('count(id)>5');
      builder.apply(qb, [], [], havingAst, planner);

      expect(qb.andHaving).toHaveBeenCalledOnce();
      const [sql, params] = qb.andHaving.mock.calls[0];
      expect(sql).toBe('COUNT(root.id) > :hv_0');
      expect(params).toMatchObject({ hv_0: 5 });
    });

    it('applies COUNT >= threshold having', () => {
      const qb = makeQb();
      const planner = makePlanner({ id: { alias: 'root', column: 'id' } });

      const havingAst = parseWhereClause('count(id)>=3');
      builder.apply(qb, [], [], havingAst, planner);

      const [sql] = qb.andHaving.mock.calls[0];
      expect(sql).toBe('COUNT(root.id) >= :hv_0');
    });

    it('applies AVG having condition', () => {
      const qb = makeQb();
      const planner = makePlanner({ salary: { alias: 'root', column: 'salary' } });

      const havingAst = parseWhereClause('avg(salary)>50000');
      builder.apply(qb, [], [], havingAst, planner);

      const [sql, params] = qb.andHaving.mock.calls[0];
      expect(sql).toBe('AVG(root.salary) > :hv_0');
      expect(params).toMatchObject({ hv_0: 50000 });
    });

    it('applies AND-combined HAVING conditions', () => {
      const qb = makeQb();
      const planner = makePlanner({
        id: { alias: 'root', column: 'id' },
        salary: { alias: 'root', column: 'salary' },
      });

      const havingAst = parseWhereClause('count(id)>5 AND avg(salary)>30000');
      builder.apply(qb, [], [], havingAst, planner);

      expect(qb.andHaving).toHaveBeenCalledOnce();
      const [sql, params] = qb.andHaving.mock.calls[0];
      expect(sql).toBe('(COUNT(root.id) > :hv_0) AND (AVG(root.salary) > :hv_1)');
      expect(params).toMatchObject({ hv_0: 5, hv_1: 30000 });
    });

    it('applies OR-combined HAVING conditions', () => {
      const qb = makeQb();
      const planner = makePlanner({
        id: { alias: 'root', column: 'id' },
        salary: { alias: 'root', column: 'salary' },
      });

      const havingAst = parseWhereClause('count(id)>10 OR sum(salary)>1000000');
      builder.apply(qb, [], [], havingAst, planner);

      expect(qb.andHaving).toHaveBeenCalledOnce();
      const [sql] = qb.andHaving.mock.calls[0];
      expect(sql).toContain('OR');
      expect(sql).toContain('COUNT(root.id) > :hv_0');
      expect(sql).toContain('SUM(root.salary) > :hv_1');
    });

    it('uses unique param names across multiple HAVING conditions', () => {
      const qb = makeQb();
      const planner = makePlanner({
        id: { alias: 'root', column: 'id' },
        salary: { alias: 'root', column: 'salary' },
        bonus: { alias: 'root', column: 'bonus' },
      });

      const havingAst = parseWhereClause('count(id)>1 AND avg(salary)>2 AND sum(bonus)>3');
      builder.apply(qb, [], [], havingAst, planner);

      const [, params] = qb.andHaving.mock.calls[0];
      expect(Object.keys(params as object)).toEqual(['hv_0', 'hv_1', 'hv_2']);
    });
  });

  // -------------------------------------------------------------------------
  // Full combined usage
  // -------------------------------------------------------------------------

  describe('combined GROUP BY + aggregate + HAVING', () => {
    it('applies all three together', () => {
      const qb = makeQb();
      const planner = makePlanner({
        'department.id': { alias: 'root_department', column: 'id' },
        id: { alias: 'root', column: 'id' },
        salary: { alias: 'root', column: 'salary' },
      });

      const havingAst = parseWhereClause('count(id)>5');
      builder.apply(
        qb,
        ['department.id'],
        [
          { fn: 'count', field: 'id' },
          { fn: 'avg', field: 'salary' },
        ],
        havingAst,
        planner,
      );

      expect(qb.groupBy).toHaveBeenCalledWith('root_department.id');
      expect(qb.addSelect).toHaveBeenCalledWith('COUNT(root.id)', 'count_id');
      expect(qb.addSelect).toHaveBeenCalledWith('AVG(root.salary)', 'avg_salary');
      expect(qb.andHaving).toHaveBeenCalledOnce();
    });
  });
});
