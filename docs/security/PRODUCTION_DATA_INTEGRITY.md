# Production Data Integrity & Demo/Mock Isolation Specification

**Document Version:** 1.0.0  
**Compliance Standard:** FIX 8.3 — Production Data Integrity  
**Classification:** Security & Data Integrity Policy  

---

## 1. Executive Summary & Core Invariant

The Web Privacy Diagnostic Engine strictly adheres to the **Zero Fabricated Production Activity Policy**. In production runtime:
- All analytics, metrics, scan records, traffic telemetry, security event logs, and administrative audit trails **MUST ONLY** originate from authentic user activity, real diagnostic scans, and verified administrative actions.
- **ZERO** mock, demo, simulated, or pre-seeded data may exist on initial production startup.
- The platform starts with an initial baseline of **0 scans, 0 page views, 0 synthetic events**, displaying clear and localized empty-state indicators until real activity occurs.

---

## 2. Production Guard Architecture

To prevent accidental data pollution in production, the application enforces the `ProductionGuard` subsystem (`server/db/productionGuard.ts`):

```typescript
export class ProductionGuard {
  public static isProduction(): boolean;
  public static assertNoProductionSeedExecution(context?: string): void;
  public static assertNoSyntheticScans(): void;
  public static verifyCleanDatabaseState(repo: DatabaseRepository): Promise<ValidationResult>;
}
```

### Production Guard Behavior Matrix

| Environment | Seed Execution Attempt | Result |
| :--- | :--- | :--- |
| `NODE_ENV=production` | Explicit invocation | **Throws `[PRODUCTION_GUARD_VIOLATION]` Runtime Error** |
| `APP_ENV=production` | Explicit invocation | **Throws `[PRODUCTION_GUARD_VIOLATION]` Runtime Error** |
| `NODE_ENV=development` | Explicit `loadDevelopmentSeeds()` | Allowed only for isolated local UI testing |
| `NODE_ENV=test` | Unit test execution | Isolated in-memory repository with clean lifecycle resets |

---

## 3. Separation of Environments

### 3.1 Production Environment (`NODE_ENV=production`)
1. **Startup Baseline:** Clean database state.
2. **Scan Sessions:** Only recorded when a client performs a real diagnostic scan via `/api/privacy/score` or `/api/analyze/browser`.
3. **Telemetry & Page Views:** Measured dynamically by real HTTP request telemetry middleware.
4. **Performance Metrics:** Derived directly from live endpoint request timings and HTTP response status codes.
5. **Security & Audit Logs:** Triggered only on real authentication events, authorization checks, CSRF rejections, rate limiting, and administrative actions.
6. **Administrator Identity:** Only the legitimately configured admin account is initialized (via `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables with PBKDF2 hashing).

### 3.2 Development Environment (`NODE_ENV=development`)
1. In-memory or local database starts cleanly with 0 records by default.
2. Development benchmark fixtures are isolated strictly in `server/db/dev-seeds/devSeedData.ts`.
3. Any attempt to invoke `devSeedData.ts` in production is rejected by `ProductionGuard`.

### 3.3 Test Environment (`NODE_ENV=test`)
1. Test fixtures remain strictly within `server/tests/`.
2. Each test suite runs in isolated memory spaces without polluting production persistence.

---

## 4. Empty State UX Guarantees

When zero production records exist, the Admin Dashboard displays authentic empty states without falling back to placeholder numbers:

- **Total Scans:** `0`
- **Fleet Average Score:** `0 / 100` (or `0` with "No production activity yet")
- **VPN Detection Rate:** `0%`
- **WebRTC Leak Rate:** `0%`
- **Top Countries:** `"No country telemetry recorded yet."`
- **Score Distribution:** All tiers (`EXCELLENT`, `GOOD`, `MODERATE`, `CRITICAL`) at `0 (0%)`
- **Recent Scans Table:** `"No scan session records found."`
- **Security Logs Table:** `"No security event logs recorded."`
- **Traffic Routes:** `"No route traffic recorded yet."`
- **Traffic Languages:** `"No language traffic recorded yet."`
- **Traffic Devices:** `"No device telemetry recorded yet."`
- **Performance Benchmarks:** `"No API performance metrics recorded yet."`
- **Audit Trail Table:** `"No administrative audit records logged."`

---

## 5. Security & Anonymization Invariants

- **Zero Raw IP Persistence:** Scan records store only HMAC-SHA256 salted hashes (`ipHash`). Raw IP addresses are never persisted in scan sessions.
- **Zero Plaintext Password Persistence:** Administrator passwords are stored strictly as PBKDF2-SHA256 hashes with individual 128-bit random salts.
- **Audit Immutability:** Audit trail records are append-only.
