/**
 * FIX 8.3 — Production Data Integrity & Demo/Mock Isolation Test Suite
 * 
 * Verifies:
 * 1. Clean Database Startup State (zero synthetic scans, zero fake pageviews, zero fake logs)
 * 2. Aggregations return 0 (not fallback 100 or mock numbers) on zero records
 * 3. ProductionGuard assertion throws runtime error in production mode
 * 4. Development seeds cannot be executed in production mode
 * 5. Explicit non-production dev seeds load properly when explicitly invoked
 * 6. Real user scans, page views, performance metrics, and admin audits record accurately
 * 7. Salted HMAC pseudonymization invariants preserved across real scans
 */

import assert from 'assert';
import { DatabaseRepository } from '../db/repository';
import { ProductionGuard } from '../db/productionGuard';
import { loadDevelopmentSeeds } from '../db/dev-seeds/devSeedData';

async function runFix8_3ProductionDataIntegrityTests() {
  console.log('============================================================');
  console.log('RUNNING FIX 8.3 — PRODUCTION DATA INTEGRITY TESTS');
  console.log('============================================================\n');

  const originalEnv = process.env.NODE_ENV;
  const originalAppEnv = process.env.APP_ENV;

  try {
    // 1. Clean Database Startup State
    console.log('1. Testing Clean Database Startup State (Zero Fabrication)...');
    {
      const repo = new DatabaseRepository();
      const paginatedScans = repo.getScanSessionsPaginated({});
      assert.strictEqual(paginatedScans.data.length, 0, 'Initial scan sessions array must be empty');
      assert.strictEqual(paginatedScans.pagination.total, 0, 'Initial scan session total must be 0');

      const secLogs = repo.getSecurityLogsPaginated({});
      assert.strictEqual(secLogs.data.length, 0, 'Initial security logs array must be empty');
      assert.strictEqual(secLogs.pagination.total, 0, 'Initial security log total must be 0');

      const auditLogs = repo.getAdminAuditLogsPaginated({});
      assert.strictEqual(auditLogs.data.length, 0, 'Initial admin audit logs array must be empty');
      assert.strictEqual(auditLogs.pagination.total, 0, 'Initial admin audit log total must be 0');

      const traffic = repo.getPageViewMetrics();
      assert.strictEqual(traffic.totalViews, 0, 'Initial page view count must be 0');
      assert.strictEqual(traffic.routeBreakdown.length, 0, 'Initial route breakdown must be empty');

      const perf = repo.getPerformanceMetricsSummary();
      assert.strictEqual(perf.totalRequests, 0, 'Initial performance request count must be 0');
      assert.strictEqual(perf.avgResponseTimeMs, 0, 'Initial average response time must be 0');

      const summary = repo.getSystemAnalyticsSummary();
      assert.strictEqual(summary.totalScans, 0, 'Aggregated totalScans must be 0');
      assert.strictEqual(summary.uniqueIpsCount, 0, 'Aggregated uniqueIpsCount must be 0');
      assert.strictEqual(summary.averagePrivacyScore, 0, 'Aggregated averagePrivacyScore must be 0 on empty records');
      assert.strictEqual(summary.vpnDetectionRate, 0, 'Aggregated vpnDetectionRate must be 0');
      assert.strictEqual(summary.webRtcLeakRate, 0, 'Aggregated webRtcLeakRate must be 0');
      assert.deepStrictEqual(summary.topCountries, [], 'Aggregated topCountries must be empty');
      assert.deepStrictEqual(summary.recentScans, [], 'Aggregated recentScans must be empty');
      assert.strictEqual((summary.tierCounts || {}).EXCELLENT, 0);
      assert.strictEqual((summary.tierCounts || {}).GOOD, 0);
      assert.strictEqual((summary.tierCounts || {}).MODERATE, 0);
      assert.strictEqual((summary.tierCounts || {}).CRITICAL, 0);

      const check = await ProductionGuard.verifyCleanDatabaseState(repo);
      assert.strictEqual(check.isClean, true, 'Clean database state check must pass');
      assert.strictEqual(check.counts.scans, 0);
      assert.strictEqual(check.counts.pageViews, 0);
      assert.strictEqual(check.counts.performanceMetrics, 0);
      console.log('  [PASS] Fresh repository starts cleanly with 0 records and 0 aggregates');
    }

    // 2. Production Guard Subsystem Enforcement
    console.log('2. Testing Production Guard Subsystem Enforcement...');
    {
      process.env.NODE_ENV = 'production';
      assert.strictEqual(ProductionGuard.isProduction(), true, 'isProduction must return true when NODE_ENV is production');

      let blockedAssert = false;
      try {
        ProductionGuard.assertNoProductionSeedExecution('Direct seed call');
      } catch (err: any) {
        blockedAssert = err.message.includes('PRODUCTION_GUARD_VIOLATION');
      }
      assert.strictEqual(blockedAssert, true, 'ProductionGuard must throw error on seed execution in production');

      let blockedSynthetic = false;
      try {
        ProductionGuard.assertNoSyntheticScans();
      } catch (err: any) {
        blockedSynthetic = err.message.includes('PRODUCTION_GUARD_VIOLATION');
      }
      assert.strictEqual(blockedSynthetic, true, 'assertNoSyntheticScans must throw error in production');

      const repo = new DatabaseRepository();
      let blockedRepoSeeds = false;
      try {
        repo.loadDevelopmentSeeds();
      } catch (err: any) {
        blockedRepoSeeds = err.message.includes('PRODUCTION_GUARD_VIOLATION');
      }
      assert.strictEqual(blockedRepoSeeds, true, 'repo.loadDevelopmentSeeds must throw error in production');

      let blockedDevSeedHelper = false;
      try {
        loadDevelopmentSeeds(repo);
      } catch (err: any) {
        blockedDevSeedHelper = err.message.includes('PRODUCTION_GUARD_VIOLATION');
      }
      assert.strictEqual(blockedDevSeedHelper, true, 'loadDevelopmentSeeds helper must throw error in production');
      console.log('  [PASS] ProductionGuard strictly rejects all seed executions in production mode');
    }

    // 3. Isolated Development Seed Loader (Non-Production Only)
    console.log('3. Testing Isolated Development Seed Loader (Non-Production Only)...');
    {
      process.env.NODE_ENV = 'development';
      const repo = new DatabaseRepository();
      assert.strictEqual(repo.getScanSessionsPaginated({}).pagination.total, 0);

      repo.loadDevelopmentSeeds();

      const paginated = repo.getScanSessionsPaginated({});
      assert.strictEqual(paginated.pagination.total, 48, 'Dev seeds must populate exactly 48 benchmark scans in development');
      assert.strictEqual(paginated.data.length, 10, 'Paginated default limit must return 10 items');

      const summary = repo.getSystemAnalyticsSummary();
      assert.strictEqual(summary.totalScans, 48);
      assert.ok(summary.averagePrivacyScore > 0, 'Average score must be calculated from loaded seeds');
      assert.ok(summary.topCountries.length > 0, 'Top countries must be populated from loaded seeds');
      console.log('  [PASS] Development seed loader populates 48 benchmark records when explicitly invoked in non-production');
    }

    // 4. Real User Activity & Telemetry Recording
    console.log('4. Testing Real User Activity & Telemetry Recording...');
    {
      process.env.NODE_ENV = 'production';
      const repo = new DatabaseRepository();
      const rawIp = '198.51.100.77';

      // Record real scan
      const scan = repo.recordScanSession({
        ipHash: repo.anonymizeIp(rawIp),
        countryCode: 'DE',
        city: 'Frankfurt',
        isp: 'Deutsche Telekom AG',
        isVpn: false,
        isProxy: false,
        isTor: false,
        isWebRtcLeak: false,
        privacyScore: 90,
        scoreTier: 'EXCELLENT',
        userAgentCategory: 'Desktop',
      });

      assert.ok(scan.id.startsWith('scan_'), 'Scan record must have a valid ID');
      assert.notStrictEqual(scan.ipHash, rawIp, 'IP hash must be anonymized HMAC');
      assert.strictEqual(scan.countryCode, 'DE');

      const summary = repo.getSystemAnalyticsSummary();
      assert.strictEqual(summary.totalScans, 1);
      assert.strictEqual(summary.uniqueIpsCount, 1);
      assert.strictEqual(summary.averagePrivacyScore, 90);
      assert.strictEqual((summary.tierCounts || {}).EXCELLENT, 1);
      assert.deepStrictEqual(summary.topCountries, [{ countryCode: 'DE', count: 1 }]);

      // Record real page view
      repo.recordPageView({
        route: '/headers',
        language: 'de',
        userAgentCategory: 'Desktop',
        durationMs: 65,
      });

      const traffic = repo.getPageViewMetrics();
      assert.strictEqual(traffic.totalViews, 1);
      assert.deepStrictEqual(traffic.routeBreakdown, [{ route: '/headers', count: 1 }]);

      // Record real performance metric
      repo.recordPerformanceMetric({
        endpoint: '/api/privacy/score',
        method: 'GET',
        statusCode: 200,
        responseTimeMs: 25,
      });

      const perf = repo.getPerformanceMetricsSummary();
      assert.strictEqual(perf.totalRequests, 1);
      assert.strictEqual(perf.avgResponseTimeMs, 25);
      assert.strictEqual(perf.errorRatePercent, 0);

      // Record real security log and audit log
      repo.recordSecurityLog({
        eventType: 'ADMIN_LOGIN_SUCCESS',
        ipAddress: '127.0.0.1',
        details: 'Admin user authenticated with valid session token.',
      });

      repo.recordAdminAudit({
        adminUsername: 'admin',
        action: 'BOOTSTRAP_ADMIN',
        ipAddress: '127.0.0.1',
        details: 'Admin account initialized.',
      });

      const secLogs = repo.getSecurityLogsPaginated({});
      assert.strictEqual(secLogs.pagination.total, 1);
      assert.strictEqual(secLogs.data[0].eventType, 'ADMIN_LOGIN_SUCCESS');

      const auditLogs = repo.getAdminAuditLogsPaginated({});
      assert.strictEqual(auditLogs.pagination.total, 1);
      assert.strictEqual(auditLogs.data[0].action, 'BOOTSTRAP_ADMIN');

      console.log('  [PASS] Real user activity and diagnostic scans accurately recorded and aggregated');
    }

    console.log('\n============================================================');
    console.log('ALL FIX 8.3 PRODUCTION DATA INTEGRITY TESTS PASSED [100% OK]');
    console.log('============================================================');
  } finally {
    process.env.NODE_ENV = originalEnv;
    process.env.APP_ENV = originalAppEnv;
  }
}

runFix8_3ProductionDataIntegrityTests().catch((err) => {
  console.error('FIX 8.3 Test Suite Failed:', err);
  process.exit(1);
});
