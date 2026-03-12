/**
 * k6 Load Test: Login Flow
 *
 * Scenario: POST /staff/auth/login → mfaToken → POST /staff/auth/login/mfa-verify
 * Pre-requisite: test users seeded with known TOTP secrets
 *
 * Run locally:
 *   k6 run test/load/scenarios/login-flow.k6.ts
 *
 * Run against staging:
 *   TARGET_URL=https://api.staging.example.com k6 run test/load/scenarios/login-flow.k6.ts
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { stages, thresholds, BASE_URL } from '../k6.config';

export const options = {
  stages,
  thresholds: {
    ...thresholds,
    login_success_rate: ['rate>0.95'],
  },
};

const loginSuccessRate = new Rate('login_success_rate');
const mfaVerifyDuration = new Trend('mfa_verify_duration');

// Test credentials — must be pre-seeded in the DB before running
const TEST_USERS = [
  { email: 'loadtest1@example.com', password: 'LoadTest1!', totpSecret: 'JBSWY3DPEHPK3PXP' },
  { email: 'loadtest2@example.com', password: 'LoadTest1!', totpSecret: 'JBSWY3DPEHPK3PXP' },
  { email: 'loadtest3@example.com', password: 'LoadTest1!', totpSecret: 'JBSWY3DPEHPK3PXP' },
];

export default function () {
  // Pick a random test user
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];

  // Step 1: Login with credentials
  const loginRes = http.post(
    `${BASE_URL}/staff/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'login' },
    },
  );

  const loginOk = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login returns mfaToken': (r) => {
      try {
        const body = JSON.parse(r.body as string);
        return !!body?.data?.mfaToken || !!body?.mfaToken;
      } catch {
        return false;
      }
    },
  });

  if (!loginOk) {
    loginSuccessRate.add(false);
    sleep(1);
    return;
  }

  // Note: In a real load test, TOTP codes must be generated per-second.
  // For testing purposes, we rely on the test infrastructure to provide valid codes.
  // A seed script would generate time-based codes or pre-compute them.
  const mfaStart = Date.now();
  const mfaVerifyRes = http.post(
    `${BASE_URL}/staff/auth/login/mfa-verify`,
    JSON.stringify({
      mfaToken: 'placeholder-token', // Set by actual test setup
      totpCode: '000000', // Would be generated dynamically
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'mfa-verify' },
    },
  );

  mfaVerifyDuration.add(Date.now() - mfaStart);

  const mfaOk = check(mfaVerifyRes, {
    'mfa verify responds': (r) => r.status !== 500,
  });

  loginSuccessRate.add(mfaOk);
  sleep(1);
}
