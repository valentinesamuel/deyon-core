import { describe, it, expect } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { SelectQueryBuilder } from 'typeorm';
import { applyHybridSearch } from './hybridSearch';
import { JoinPlanner } from '../planner/joinPlanner';
import { ModelQueryConfig } from '../types/modelConfig.types';
import { SearchInput } from '../types/query.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQb() {
  const qb = mock<SelectQueryBuilder<any>>();
  // chainable
  qb.andWhere.mockReturnThis();
  return qb;
}

function makePlanner(mapping: Record<string, { alias: string; column: string }>) {
  const planner = mock<JoinPlanner>();
  planner.registerPath.mockImplementation((path: string) => {
    if (mapping[path]) return mapping[path];
    // default: root-level field
    return { alias: 'root', column: path };
  });
  return planner;
}

const baseConfig: ModelQueryConfig = {
  allowedFilters: [],
  allowedSort: [],
  allowedSearch: [
    { field: 'firstName', type: 'fts' },
    { field: 'notes', type: 'tri' },
    { field: 'doctor.name', type: 'fts' },
    { field: 'doctor.name', type: 'tri' },
  ],
  allowedRelations: [],
  allowedFields: [],
  trigramThreshold: 0.3,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('applyHybridSearch', () => {
  it('does nothing when search array is empty', () => {
    const qb = makeQb();
    const planner = makePlanner({});
    applyHybridSearch(qb, [], baseConfig, planner);
    expect(qb.andWhere).not.toHaveBeenCalled();
  });

  it('applies FTS condition for fts search type', () => {
    const qb = makeQb();
    const planner = makePlanner({ firstName: { alias: 'root', column: 'firstName' } });

    const search: SearchInput[] = [{ field: 'firstName', type: 'fts', value: 'john' }];
    applyHybridSearch(qb, search, baseConfig, planner);

    expect(qb.andWhere).toHaveBeenCalledOnce();
    const [sql, params] = qb.andWhere.mock.calls[0];
    expect(sql).toContain('to_tsvector');
    expect(sql).toContain('plainto_tsquery');
    expect(sql).toContain('root.firstName');
    expect(params).toMatchObject({ qe_search_0: 'john' });
  });

  it('applies trigram condition for tri search type', () => {
    const qb = makeQb();
    const planner = makePlanner({ notes: { alias: 'root', column: 'notes' } });

    const search: SearchInput[] = [{ field: 'notes', type: 'tri', value: 'fever' }];
    applyHybridSearch(qb, search, baseConfig, planner);

    expect(qb.andWhere).toHaveBeenCalledOnce();
    const [sql, params] = qb.andWhere.mock.calls[0];
    expect(sql).toContain('root.notes %');
    expect(sql).toContain('set_limit');
    expect(params).toMatchObject({
      qe_search_0_thr: 0.3,
      qe_search_0: 'fever',
    });
  });

  it('uses custom trigramThreshold from config', () => {
    const qb = makeQb();
    const planner = makePlanner({ notes: { alias: 'root', column: 'notes' } });
    const config = { ...baseConfig, trigramThreshold: 0.6 };

    const search: SearchInput[] = [{ field: 'notes', type: 'tri', value: 'fever' }];
    applyHybridSearch(qb, search, config, planner);

    const [, params] = qb.andWhere.mock.calls[0];
    expect(params).toMatchObject({ qe_search_0_thr: 0.6 });
  });

  it('combines FTS and trigram in the same call (both ANDed)', () => {
    const qb = makeQb();
    const planner = makePlanner({
      'doctor.name': { alias: 'root_doctor', column: 'name' },
      notes: { alias: 'root', column: 'notes' },
    });

    const search: SearchInput[] = [
      { field: 'doctor.name', type: 'fts', value: 'john' },
      { field: 'notes', type: 'tri', value: 'fever' },
    ];
    applyHybridSearch(qb, search, baseConfig, planner);

    expect(qb.andWhere).toHaveBeenCalledTimes(2);

    const [sql0, params0] = qb.andWhere.mock.calls[0];
    expect(sql0).toContain('root_doctor.name');
    expect(sql0).toContain('to_tsvector');
    expect(params0).toMatchObject({ qe_search_0: 'john' });

    const [sql1, params1] = qb.andWhere.mock.calls[1];
    expect(sql1).toContain('root.notes');
    expect(params1).toMatchObject({ qe_search_1: 'fever' });
  });

  it('registers relation joins via joinPlanner for nested field paths', () => {
    const qb = makeQb();
    const planner = makePlanner({ 'doctor.name': { alias: 'root_doctor', column: 'name' } });

    const search: SearchInput[] = [{ field: 'doctor.name', type: 'fts', value: 'smith' }];
    applyHybridSearch(qb, search, baseConfig, planner);

    expect(planner.registerPath).toHaveBeenCalledWith('doctor.name');
  });

  it('uses unique param names for multiple search inputs to avoid collision', () => {
    const qb = makeQb();
    const planner = makePlanner({
      firstName: { alias: 'root', column: 'firstName' },
      notes: { alias: 'root', column: 'notes' },
    });

    const search: SearchInput[] = [
      { field: 'firstName', type: 'fts', value: 'alice' },
      { field: 'notes', type: 'tri', value: 'pain' },
    ];
    applyHybridSearch(qb, search, baseConfig, planner);

    const params0 = qb.andWhere.mock.calls[0][1] as Record<string, unknown>;
    const params1 = qb.andWhere.mock.calls[1][1] as Record<string, unknown>;

    // no key overlap
    const allKeys = [...Object.keys(params0), ...Object.keys(params1)];
    const uniqueKeys = new Set(allKeys);
    expect(uniqueKeys.size).toBe(allKeys.length);
  });
});
