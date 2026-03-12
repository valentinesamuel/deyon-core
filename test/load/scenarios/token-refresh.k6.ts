/**
 * k6 Load Test: Token Refresh
 *
 * Scenario: Login → POST /staff/auth/refresh (repeat)
 * Tests Redis token hash lookup under sustained load.
 *
 * Run locally:
 *   k6 run test/load/scenarios/token-refresh.k6.ts
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { stages, thresholds, BASE_URL } from '../k6.config';

export const options = {
  stages,
  thresholds: {
    ...thresholds,
    refresh_success_rate: ['rate>0.95'],
  },
};

const refreshSuccessRate = new Rate('refresh_success_rate');

export function setup() {
  // In a real scenario, obtain an initial session here and pass cookies to default()
  return { refreshToken: 'pre-seeded-refresh-token' };
}

export default function (data: { refreshToken: string }) {
  const refreshRes = http.post(`${BASE_URL}/staff/auth/refresh`, null, {
    headers: {
      'Content-Type': 'application/json',
      Cookie: `refresh_token=${data.refreshToken}`,
    },
    tags: { endpoint: 'token-refresh' },
  });

  const ok = check(refreshRes, {
    'refresh status is 200': (r) => r.status === 200,
    'refresh returns new cookies': (r) => {
      const setCookie = r.headers['Set-Cookie'];
      return !!setCookie;
    },
  });

  refreshSuccessRate.add(ok);
  sleep(0.5);
}
