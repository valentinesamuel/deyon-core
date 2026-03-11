# Testing Guide

## Overview

The test suite is organised into four tiers, each with a distinct purpose:

| Tier | Location | What it covers | Infrastructure needed |
|------|----------|----------------|----------------------|
| **Unit** | `src/**/*.spec.ts` | Individual classes/functions with all dependencies mocked | None |
| **Integration** | `test/integration/**/*.spec.ts` | Real NestJS modules backed by TestContainers Postgres + Redis | Docker |
| **E2E** | `test/e2e/**/*.e2e-spec.ts` | Full HTTP app via supertest — tests routes, guards, interceptors | Docker |
| **Load** | `test/load/scenarios/*.k6.ts` | Throughput, latency, and concurrency under realistic traffic | Running app + k6 |

---

## Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| Node.js ≥ 20 | Runtime | [nodejs.org](https://nodejs.org) |
| pnpm | Package manager | `npm i -g pnpm` |
| Docker (for integration / e2e) | TestContainers | [docker.com](https://www.docker.com) |
| k6 (for load tests) | Load testing | `brew install k6` |

```bash
pnpm install
```

---

## Running Tests

### Unit tests (no Docker required)
```bash
pnpm test:unit
```

### Integration tests (requires Docker)
```bash
pnpm test:integration
```

### E2E tests (requires Docker)
```bash
pnpm test:e2e
```

### All tiers
```bash
pnpm test
```

### With coverage
```bash
pnpm test:cov
```

### CI reporter (verbose output)
```bash
pnpm test:ci
```

---

## Load Tests

Load tests are k6 scripts located in `test/load/scenarios/`. They require a running application instance.

```bash
# Start the app first
pnpm start:dev

# Then run individual scenarios
k6 run test/load/scenarios/login-flow.k6.ts --env TARGET_URL=http://localhost:3000
k6 run test/load/scenarios/token-refresh.k6.ts --env TARGET_URL=http://localhost:3000
k6 run test/load/scenarios/role-protected.k6.ts --env TARGET_URL=http://localhost:3000
```

---

## CI Pipeline

The CI workflow is defined in `.github/workflows/ci.yml` with two jobs:

- **unit-tests**: Runs `pnpm test:unit` — no Docker required, runs on every push.
- **integration-e2e-tests**: Runs `pnpm test:integration && pnpm test:e2e` — spins up Docker services.

### Running CI locally with `act`

```bash
# Install act: brew install act

# Run unit tests job
act -j unit-tests

# Run integration + e2e job
act -j integration-e2e-tests
```

---

## Coverage

Coverage reports are generated per tier under the `coverage/` directory:

| Tier | Output directory |
|------|-----------------|
| Unit | `coverage/unit/` |
| Integration | `coverage/integration/` |
| E2E | `coverage/e2e/` |

Open `coverage/<tier>/index.html` in a browser for the HTML report.

**Target thresholds** (enforced in CI):
- Statements: ≥ 80%
- Branches: ≥ 75%
- Functions: ≥ 80%

---

## Test Environment Variables

Integration and E2E tests automatically configure all required environment variables via
`test/helpers/integration-setup.ts` → `setTestEnv()`. You do **not** need a `.env` file to run
these tests — the values are injected from TestContainers.

| Variable | Value in tests | Notes |
|----------|---------------|-------|
| `NODE_ENV` | `development` | Prevents `dropSchema` + `migrationsRun` in typeorm.config |
| `DATABASE_TYPE` | `postgres` | |
| `DATABASE_HOST` | TestContainers host | Parsed from PG connection string |
| `DATABASE_PORT` | TestContainers port | Parsed from PG connection string |
| `DATABASE_DB` | `deyon_test` | |
| `DATABASE_USER` | `test` | |
| `DATABASE_PASSWORD` | `test` | |
| `DATABASE_SYNCHRONIZE` | `true` | TypeORM auto-creates schema — no migrations needed |
| `REDIS_URL` | `redis://<host>:<port>` | From TestContainers Redis |
| `TOKEN_ENCRYPTION_KEY` | `12345678901234567890123456789012` | 32-byte AES-256-GCM key |
| `JWT_ACCESS_SECRET` | `test-jwt-secret-that-is-at-least-32-chars-long!` | |
| `APP_AUTH_NAME` | `x-api-key` | Header name for AuthorizationGuard |
| `APP_KEY` | `test-api-key` | Header value for AuthorizationGuard |
| `FRONTEND_URL` | `http://localhost:3001` | Used in password-reset email links |

> All E2E HTTP requests must include `.set('x-api-key', 'test-api-key')` to pass
> `AuthorizationGuard`. The E2E helper `API_KEY_HEADER` constant provides this.

---

## Debugging

### Run a single test file
```bash
# Unit
pnpm vitest run --config vitest.unit.config.ts src/modules/auth/usecases/loginStaff.uc.spec.ts

# Integration
pnpm vitest run --config vitest.integration.config.ts test/integration/auth/loginStaff.integration.spec.ts

# E2E
pnpm vitest run --config vitest.e2e.config.ts test/e2e/auth/auth.login.e2e-spec.ts
```

### Verbose output
```bash
pnpm vitest run --reporter=verbose --config vitest.unit.config.ts
```

### Watch mode (unit tests)
```bash
pnpm vitest watch --config vitest.unit.config.ts
```

### Common issues

**Integration/E2E tests fail with "Cannot connect to Docker"**
→ Ensure Docker Desktop is running before executing integration or E2E tests.

**`EADDRINUSE` or port conflicts**
→ Integration tests do not start an HTTP server (they use `module.get()` directly).
  E2E tests bind to a random port via supertest — no manual port management needed.

**TOTP code rejected in E2E tests**
→ Ensure your system clock is synchronised (NTP). TOTP codes expire every 30 seconds.

**`Token reuse detected` in refresh tests**
→ Each `beforeEach` calls `truncateAllTables()`. Make sure Redis is also cleared for
  relevant keys (the helpers handle login-attempt and lockout keys automatically).
