// Shared k6 configuration: stages, thresholds, and helpers

export const stages = [
  { duration: '30s', target: 100 }, // Ramp up to 100 VUs
  { duration: '2m', target: 100 }, // Sustain 100 VUs
  { duration: '1m', target: 500 }, // Ramp to 500 VUs
  { duration: '5m', target: 500 }, // Sustain 500 VUs
  { duration: '30s', target: 0 }, // Ramp down
];

export const thresholds = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.01'],
  http_reqs: ['rate>10'],
};

export const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export function getAuthHeaders(accessToken: string) {
  return { Cookie: `access_token=${accessToken}` };
}

export function check200(res: any, label: string): boolean {
  const ok = res.status === 200 || res.status === 201;
  if (!ok) {
    console.error(`[${label}] Unexpected status ${res.status}: ${res.body}`);
  }
  return ok;
}
