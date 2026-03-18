import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryAnalytics, QueryAnalyticsPayload } from './queryAnalytics';
import { Logger } from '@nestjs/common';

function makePayload(overrides: Partial<QueryAnalyticsPayload> = {}): QueryAnalyticsPayload {
  return {
    entity: 'Staff',
    execTimeMs: 42,
    joinsUsed: 1,
    filtersUsed: 2,
    searchUsed: false,
    aggregationsUsed: false,
    rowsReturned: 10,
    cacheHit: false,
    queryCost: 5,
    ...overrides,
  };
}

describe('QueryAnalytics', () => {
  let analytics: QueryAnalytics;
  let verboseSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    analytics = new QueryAnalytics();
    verboseSpy = vi.spyOn(Logger.prototype, 'verbose').mockImplementation(() => undefined);
  });

  it('calls logger.verbose with the full payload', () => {
    const payload = makePayload();
    analytics.log(payload);

    expect(verboseSpy).toHaveBeenCalledOnce();
    expect(verboseSpy).toHaveBeenCalledWith(payload);
  });

  it('includes all required analytics fields', () => {
    const payload = makePayload({ cacheHit: true, searchUsed: true, aggregationsUsed: true });
    analytics.log(payload);

    const logged = verboseSpy.mock.calls[0][0] as QueryAnalyticsPayload;
    expect(logged).toHaveProperty('entity');
    expect(logged).toHaveProperty('execTimeMs');
    expect(logged).toHaveProperty('joinsUsed');
    expect(logged).toHaveProperty('filtersUsed');
    expect(logged).toHaveProperty('searchUsed');
    expect(logged).toHaveProperty('aggregationsUsed');
    expect(logged).toHaveProperty('rowsReturned');
    expect(logged).toHaveProperty('cacheHit');
    expect(logged).toHaveProperty('queryCost');
  });

  it('logs cache hit correctly', () => {
    analytics.log(makePayload({ cacheHit: true }));
    const logged = verboseSpy.mock.calls[0][0] as QueryAnalyticsPayload;
    expect(logged.cacheHit).toBe(true);
  });

  it('logs cache miss correctly', () => {
    analytics.log(makePayload({ cacheHit: false }));
    const logged = verboseSpy.mock.calls[0][0] as QueryAnalyticsPayload;
    expect(logged.cacheHit).toBe(false);
  });
});
