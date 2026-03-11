# Testing Strategy Plan (Vitest)

## Context

The deyon-be NestJS backend has auth fully implemented (JWT + MFA + sessions) but zero unit tests and one skeleton e2e test. This plan establishes a full, multi-tier test suite: unit, integration, e2e, and load tests — covering all 15+ use cases, 5 services, 8 repositories, 4 guards, and critical utilities.

**Switching from Jest to Vitest** — Vitest is faster, has native TypeScript + ESM support (no ts-jest), and is 1:1 API-compatible with Jest's `describe`/`it`/`expect`. The mocking API uses `vi` instead of `jest` (`vi.fn()`, `vi.mock()`, `vi.spyOn()`). All other tooling (TestContainers, supertest, faker, ioredis-mock) is fully compatible.

**Decisions:**
- Co-located unit tests (`.spec.ts` next to source)
- Integration + e2e tests in top-level `test/`
- TestContainers (real Postgres + Redis) for integration/e2e
- DB isolation: truncate tables before each test file
- Load tests with k6 (standalone binary, scripts in `test/load/`)
- CI via GitHub Actions; local execution via `act`

---

## 1. Dependency Changes

### Remove (from devDependencies)
```
jest
ts-jest
@types/jest
jest-mock-extended
```

### Add (devDependencies)
```
vitest                      ^3.x
@vitest/coverage-v8         ^3.x      # coverage provider
unplugin-swc                ^1.x      # needed for emitDecoratorMetadata (TypeORM + NestJS DI)
@swc/core                   ^1.x      # SWC transformer (used by unplugin-swc)
vitest-mock-extended        ^3.x      # type-safe mocking (mirrors jest-mock-extended API)
@testcontainers/testcontainers  ^10.x
@testcontainers/postgresql      ^10.x
@testcontainers/redis            ^10.x
@faker-js/faker              ^9.x     # v9: ESM+CJS compatible; do NOT use v10 (CJS removed)
ioredis-mock                 ^8.x     # in-memory ioredis for unit tests
```

**Why `unplugin-swc`:** Vitest's default esbuild transformer does NOT support `emitDecoratorMetadata: true` (required by TypeORM entities and NestJS DI). SWC supports it natively.

### `tsconfig.json` addition
Add to `compilerOptions`:
```json
"types": ["vitest/globals"]
```
This provides global `describe`, `it`, `expect`, `vi` etc. without explicit imports in every test file.

---

## 2. Vitest Configuration

Replace the inline jest config in `package.json` and the existing `test/jest-e2e.json` with a root `vitest.config.ts` that uses the **projects** pattern (Vitest equivalent of Jest's `projects` array):

### Root file: `vitest.config.ts`
```ts
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    projects: [
      './vitest.unit.config.ts',
      './vitest.integration.config.ts',
      './vitest.e2e.config.ts',
    ],
  },
});
```

### `vitest.unit.config.ts`
```ts
include:        ['src/**/*.spec.ts']
exclude:        ['src/**/*.module.ts', 'src/main.ts', 'src/migrations/**']
environment:    'node'
globals:        true
testTimeout:    5000
coverage:       { provider: 'v8', reportsDirectory: 'coverage/unit' }
```
No globalSetup needed — unit tests mock everything, no Docker.

### `vitest.integration.config.ts`
```ts
include:        ['test/integration/**/*.spec.ts']
environment:    'node'
globals:        true
testTimeout:    30000
pool:           'forks'
poolOptions:    { forks: { singleFork: true } }   // sequential, shared containers
globalSetup:    ['test/helpers/global-setup.ts']
setupFiles:     ['test/helpers/integration-setup.ts']
coverage:       { provider: 'v8', reportsDirectory: 'coverage/integration' }
```

### `vitest.e2e.config.ts`
```ts
include:        ['test/e2e/**/*.e2e-spec.ts']
environment:    'node'
globals:        true
testTimeout:    60000
pool:           'forks'
poolOptions:    { forks: { singleFork: true } }
globalSetup:    ['test/helpers/global-setup.ts']
setupFiles:     ['test/helpers/e2e-setup.ts']
coverage:       { provider: 'v8', reportsDirectory: 'coverage/e2e' }
```

**Note:** Integration and e2e share the same `global-setup.ts` (starts containers once). `singleFork: true` ensures tests run sequentially against shared containers.

**Note on `globalSetup`:** Vitest's global setup uses `provide(key, value)` to share container connection strings across the worker boundary (different from Jest's `process.env` trick). Integration/e2e setup files use `inject(key)` to retrieve those values.

### Updated `package.json` scripts
```
"test"             → vitest run --config vitest.config.ts
"test:unit"        → vitest run --config vitest.unit.config.ts
"test:integration" → vitest run --config vitest.integration.config.ts
"test:e2e"         → vitest run --config vitest.e2e.config.ts
"test:watch"       → vitest --config vitest.config.ts
"test:cov"         → vitest run --config vitest.config.ts --coverage
"test:ci"          → vitest run --config vitest.config.ts --reporter=verbose
```

### Delete
- `test/jest-e2e.json` (superseded)
- `jest` field from `package.json`

---

## 3. API Changes from Jest → Vitest

| Jest | Vitest |
|------|--------|
| `jest.fn()` | `vi.fn()` |
| `jest.mock()` | `vi.mock()` |
| `jest.spyOn()` | `vi.spyOn()` |
| `jest.clearAllMocks()` | `vi.clearAllMocks()` |
| `jest.resetAllMocks()` | `vi.resetAllMocks()` |
| `import * as request from 'supertest'` | `import request from 'supertest'` (default import) |
| `jest-mock-extended` | `vitest-mock-extended` (same `mock()`, `mockDeep()`, `DeepMockProxy` API) |

Everything else (`describe`, `it`, `test`, `expect`, `beforeAll`, `afterAll`, `beforeEach`, `afterEach`) is identical.

---

## 4. Proposed File Structure

```
# Root config files
vitest.config.ts               # aggregator (projects array)
vitest.unit.config.ts
vitest.integration.config.ts
vitest.e2e.config.ts

src/
  broker/
    broker.ts
    broker.spec.ts                          # unit
  modules/
    auth/
      services/
        auth.service.spec.ts                # unit
        token.service.spec.ts               # unit
        mfa.service.spec.ts                 # unit
        session.service.spec.ts             # unit
        eventLog.service.spec.ts            # unit
      usecases/
        loginStaff.uc.spec.ts              # unit
        verifyMfa.uc.spec.ts               # unit
        refreshToken.uc.spec.ts            # unit
        logout.uc.spec.ts                  # unit
        logoutAll.uc.spec.ts               # unit
        createInvite.uc.spec.ts            # unit
        acceptInvite.uc.spec.ts            # unit
        forgotPassword.uc.spec.ts          # unit
        resetPassword.uc.spec.ts           # unit
        setupMfa.uc.spec.ts                # unit
        confirmMfaSetup.uc.spec.ts         # unit
        verifyBackupCode.uc.spec.ts        # unit
    role/
      usecases/
        createRole.uc.spec.ts              # unit
    setup/
      usecases/
        bootstrapSystem.uc.spec.ts         # unit
        registerCmo.uc.spec.ts             # unit
  adapters/
    repositories/
      base.repository.spec.ts              # unit
      staff.repository.spec.ts             # unit
      mfaConfig.repository.spec.ts         # unit
  shared/
    guards/
      jwtAuth.guard.spec.ts                # unit
      permission.guard.spec.ts             # unit
      mfaToken.guard.spec.ts               # unit
      mfaSetupToken.guard.spec.ts          # unit
    utility/
      encryption/
        encryption.utility.spec.ts         # unit

test/
  helpers/
    global-setup.ts            # start Postgres + Redis TestContainers; provide() connection info
    global-teardown.ts         # stop all containers
    integration-setup.ts       # inject() conn strings, truncate tables before each file
    e2e-setup.ts               # boot NestApp via inject() conn strings, truncate, teardown after file
    test-containers.helper.ts  # container lifecycle (start/stop/getConnStrings)
    database.helper.ts         # runMigrations, truncateAllTables, seedSystemConfig
    app.helper.ts              # createTestApp(), createTestingModule()
  fixtures/
    staff.fixture.ts
    role.fixture.ts
    permission.fixture.ts
    mfaConfig.fixture.ts
    refreshToken.fixture.ts
    invite.fixture.ts
  integration/
    auth/
      loginStaff.integration.spec.ts
      verifyMfa.integration.spec.ts
      refreshToken.integration.spec.ts
      logout.integration.spec.ts
      resetPassword.integration.spec.ts
      acceptInvite.integration.spec.ts
    role/
      createRole.integration.spec.ts
    setup/
      bootstrap.integration.spec.ts
    repositories/
      staff.repository.integration.spec.ts
      refreshToken.repository.integration.spec.ts
  e2e/
    auth/
      auth.login.e2e-spec.ts
      auth.mfa.e2e-spec.ts
      auth.refresh.e2e-spec.ts
      auth.logout.e2e-spec.ts
      auth.password-reset.e2e-spec.ts
      auth.invite.e2e-spec.ts
    role/
      role.create.e2e-spec.ts
    setup/
      setup.bootstrap.e2e-spec.ts
  load/
    k6.config.ts               # shared stages + thresholds
    scenarios/
      login-flow.k6.ts
      token-refresh.k6.ts
      role-protected.k6.ts

.github/
  workflows/
    ci.yml
    load-test.yml
```

---

## 5. Test Helpers Design

### `test/helpers/global-setup.ts`
Vitest's global setup runs in a separate worker. Use `provide(key, value)` to share data:
```ts
export async function setup() {
  // Start both containers in parallel
  const [pgContainer, redisContainer] = await Promise.all([...]);
  provide('pgConnectionString', pgContainer.getConnectionUri());
  provide('redisPort', redisContainer.getMappedPort(6379).toString());
}
export async function teardown() { /* stop both containers */ }
```

### `test/helpers/integration-setup.ts`
Called via `setupFiles` (runs in each worker, before each test file):
```ts
import { inject } from 'vitest';
const pgUrl = inject('pgConnectionString');   // reads from global-setup
// set process.env, run truncateAllTables
```

### `test/helpers/database.helper.ts`
- `runMigrations(dataSource)` — runs all TypeORM migrations from `src/migrations/`
- `truncateAllTables(dataSource)` — FK-safe order: `event_log`, `refresh_token`, `mfa_config`, `invite_token`, `staff`, permission junction, `role`, `department`, `system_config`
- `seedSystemConfig(dataSource)` — inserts `setup_complete: false` row for bootstrap tests

### `test/helpers/app.helper.ts`
- `createTestApp(overrides?)` — builds `TestingModule` from `AppModule`, injects DB/Redis URLs from `inject()`, applies `ValidationPipe` + `cookieParser()` to mirror `main.ts`
- `createTestingModule(module)` — for integration tests that don't need HTTP

### `test/fixtures/`
Each factory uses `@faker-js/faker`. Key notes:
- `staff.fixture.ts`: `passwordHash` pre-set to argon2 hash of `'TestPassword1!'`
- `mfaConfig.fixture.ts`: includes plain TOTP secret so tests can generate valid codes via `otplib`
- `refreshToken.fixture.ts`: `expiresAt` defaults to 7 days from now

---

## 6. What to Test (Summary)

### Unit tests (mock everything with `vitest-mock-extended`)

**Services:**
- `auth.service`: hash/verify password, lockout check, failed-attempt counting, ephemeral token issuance, staff status validation
- `token.service`: JWT sign/verify, opaque token generation, cookie setting/clearing
- `mfa.service`: TOTP secret generation + verify (real `otplib` — no mock needed), backup code generation + verification
- `session.service`: add/remove session, enforce session limit, revoke all sessions
- `eventLog.service`: event creation, error swallowing

**Use cases (happy path + all error branches for all 15 use cases):**
- Auth: `loginStaff`, `verifyMfa`, `refreshToken`, `logout`, `logoutAll`, `createInvite`, `acceptInvite`, `forgotPassword`, `resetPassword`, `setupMfa`, `confirmMfaSetup`, `verifyBackupCode`
- Role: `createRole`
- Setup: `bootstrapSystem`, `registerCmo`

**Guards:** `JwtAuthGuard`, `PermissionGuard`, `MfaTokenGuard`, `MfaSetupTokenGuard`
- `@Public()` skip, blocklist check, permission modes (ANY/ALL), wildcard permissions

**Repositories (error-path logic only):** `findStaffAndFailIfExist`, `findStaffAndFailIfNotExist`, `saveOrUpdate`, base `findOneOrFail*` methods

**Broker:** batching, timeout, result merging, sensitive field stripping

### Integration tests (real DB + Redis)
- Login → MFA verify → session storage
- Refresh token rotation + theft detection
- Password reset full cycle
- Bootstrap + pessimistic lock
- Repository CRUD + FK constraints

### E2E tests (full HTTP layer)
- DTO validation (400s), guard rejections (401/403), happy paths (200/201), error responses (409, 400)
- Cookie presence/absence after auth operations
- Rate limiting behavior

---

## 7. Load Test Design (k6)

**Stages:** ramp 0→100 VUs (30s) → sustain 100 VUs (2m) → ramp 100→500 VUs (1m) → sustain 500 VUs (5m) → ramp down (30s)

**Thresholds:**
- `http_req_duration p(95) < 500ms`
- `http_req_duration p(99) < 1000ms`
- `http_req_failed rate < 0.01`
- `http_reqs rate > 10`

**Scenarios:**
1. `login-flow.k6.ts` — POST login → mfaToken → POST mfa-verify. Pre-seeded test users with known TOTP secrets.
2. `token-refresh.k6.ts` — Login then POST /staff/auth/refresh. Tests Redis token hash lookup under load.
3. `role-protected.k6.ts` — Login then POST /role. Stresses guard chain + Redis profile cache.

Requires a seed script to populate test users before running.

---

## 8. GitHub Actions

### `ci.yml` — push to `main/feat/**/fix/**` and PR to `main`

**Job 1: `unit-tests`** (no Docker)
- setup-node + pnpm/action-setup
- pnpm install --frozen-lockfile
- Cache: `~/.local/share/pnpm/store` keyed on `pnpm-lock.yaml`
- `pnpm test:unit --reporter=verbose`

**Job 2: `integration-e2e-tests`** (needs Docker, runs after Job 1)
- Same setup
- Docker pre-installed on `ubuntu-latest` — TestContainers uses the host daemon
- `pnpm test:integration && pnpm test:e2e`

### `load-test.yml` — manual trigger only (`workflow_dispatch`)
- Inputs: `target_url`, `scenario` name
- Uses `grafana/k6-action@v0.3.1`

### Running locally with `act`
```bash
# Unit tests (no Docker)
act -j unit-tests \
  -P ubuntu-latest=catthehacker/ubuntu:act-22.04 \
  --secret-file .env.test

# Integration + e2e (needs Docker socket)
act -j integration-e2e-tests \
  -P ubuntu-latest=catthehacker/ubuntu:act-22.04 \
  --container-daemon-socket /var/run/docker.sock \
  --secret-file .env.test
```

---

## 9. Implementation Order

| Phase | What Gets Done |
|-------|----------------|
| **1: Foundation** | Install/remove deps, create 4 vitest config files, update package.json scripts, delete jest-e2e.json, create test/helpers/, create all fixtures |
| **2: Unit — Services** | `encryption.utility`, `token.service`, `auth.service`, `mfa.service`, `session.service`, `eventLog.service` |
| **3: Unit — Use Cases** | All 12 auth usecases → `createRole` → `bootstrapSystem`, `registerCmo` |
| **4: Unit — Guards + Repos** | All 4 guards + 3 repository unit specs + `broker.spec.ts` |
| **5: Integration** | `integration-setup.ts` + all integration tests (auth flows, bootstrap, repositories) |
| **6: E2E** | `app.helper.ts` + `e2e-setup.ts` + all e2e specs |
| **7: CI** | `ci.yml`, `load-test.yml`, test with `act` |
| **8: Load** | k6 scenarios + seed script |

---

## Critical Files

- `src/broker/broker.ts` — core orchestration; unit test first to validate mocking pattern
- `src/modules/auth/usecases/loginStaff.uc.ts` — reference for all usecase mocking patterns
- `src/shared/redis/redis.service.ts` — most widely mocked dep; establish `vitest-mock-extended` mock shape early
- `src/modules/auth/services/mfa.service.ts` — needs real `otplib` (NobleCryptoPlugin + ScureBase32Plugin); fixtures must generate valid TOTP codes from encrypted secrets
- `test/jest-e2e.json` — DELETE; superseded by `vitest.e2e.config.ts`

---

## Caveats

- **`ioredis-mock`**: May not fire the `'ready'` event. If `RedisService` listens for `'ready'` before accepting commands, use `vi.mock('ioredis', ...)` with a manual mock class instead.
- **`provide()`/`inject()`**: Vitest's global setup runs in an isolated worker — connection strings must flow through `provide`/`inject`, not just `process.env`, because env changes in global setup don't propagate to test workers.
- **SWC decorator metadata**: The `unplugin-swc` config must set `jsc.transform.decoratorMetadata: true` to mirror `emitDecoratorMetadata: true` in tsconfig.

---

## Verification

After each phase:
1. `pnpm test:unit` — all unit tests pass, no skipped
2. `pnpm test:integration` — containers start, migrations run, tests pass
3. `pnpm test:e2e` — full app boots, all HTTP flows pass
4. `act -j unit-tests` — CI job passes locally
5. `act -j integration-e2e-tests --container-daemon-socket /var/run/docker.sock` — full CI passes
6. Manual k6: `k6 run test/load/scenarios/login-flow.k6.ts` against local server — thresholds pass
