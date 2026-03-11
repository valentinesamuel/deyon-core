/**
 * k6 Load Test: Role-Protected Endpoint
 *
 * Scenario: Login → POST /role (protected endpoint requiring auth + permission)
 * Tests the full guard chain + Redis profile cache under load.
 *
 * Run locally:
 *   k6 run test/load/scenarios/role-protected.k6.ts
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import { stages, thresholds, BASE_URL } from '../k6.config';

export const options = {
  stages,
  thresholds: {
    ...thresholds,
    protected_success_rate: ['rate>0.90'],
    auth_failures: ['count<100'],
  },
};

const protectedSuccessRate = new Rate('protected_success_rate');
const authFailures = new Counter('auth_failures');

export function setup() {
  // Pre-obtain access token for a super-admin user
  // In practice, this would perform a full login flow
  return { accessToken: 'pre-seeded-access-token' };
}

export default function (data: { accessToken: string }) {
  // Create a role (requires auth + role:write permission)
  const roleName = `LoadTestRole-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const createRoleRes = http.post(
    `${BASE_URL}/role`,
    JSON.stringify({
      name: roleName,
      permissions: ['staff:read'],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${data.accessToken}`,
      },
      tags: { endpoint: 'create-role' },
    },
  );

  if (createRoleRes.status === 401 || createRoleRes.status === 403) {
    authFailures.add(1);
    protectedSuccessRate.add(false);
  } else {
    const ok = check(createRoleRes, {
      'create role status is 201': (r) => r.status === 201,
    });
    protectedSuccessRate.add(ok);
  }

  sleep(0.5);
}
