import type { DatabaseRepository } from './repository';
import type { PostgresRepository } from './postgresRepository';

/**
 * Production Guard & Data Integrity Subsystem
 * Strictly enforces that production environments contain ZERO synthetic, mock, or seeded data.
 */
export class ProductionGuard {
  /**
   * Returns true if running in production mode.
   */
  public static isProduction(): boolean {
    return process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
  }

  /**
   * Centralized guard: Throws a runtime error if a seed or mock function
   * is invoked in production mode.
   */
  public static assertNoProductionSeedExecution(context = 'Development seed generator'): void {
    if (this.isProduction()) {
      throw new Error(
        `[PRODUCTION_GUARD_VIOLATION] ${context} execution is strictly blocked in production mode. Production runtime MUST ONLY contain real user activity, scans, and telemetry.`
      );
    }
  }

  /**
   * Asserts that synthetic scan creation is rejected in production.
   */
  public static assertNoSyntheticScans(): void {
    if (this.isProduction()) {
      throw new Error(
        '[PRODUCTION_GUARD_VIOLATION] Synthetic scan generation is prohibited in production.'
      );
    }
  }

  /**
   * Validates that the database or repository starts from a clean zero state
   * (scans = 0, pageViews = 0, performanceMetrics = 0, synthetic events = 0).
   */
  public static async verifyCleanDatabaseState(repo: DatabaseRepository): Promise<{
    isClean: boolean;
    counts: {
      scans: number;
      securityLogs: number;
      auditLogs: number;
      pageViews: number;
      performanceMetrics: number;
    };
  }> {
    const postgresRepo = repo.getPostgresRepository();
    if (postgresRepo) {
      const counts = await postgresRepo.getTableRecordCounts();
      const isClean =
        counts.scanSessions === 0 &&
        counts.pageViews === 0 &&
        counts.performanceMetrics === 0;
      return {
        isClean,
        counts: {
          scans: counts.scanSessions,
          securityLogs: counts.securityLogs,
          auditLogs: counts.adminAuditLogs,
          pageViews: counts.pageViews,
          performanceMetrics: counts.performanceMetrics,
        },
      };
    }

    const scans = repo.getScanSessionsPaginated({ limit: 1 }).pagination.total;
    const secLogs = repo.getSecurityLogsPaginated({ limit: 1 }).pagination.total;
    const auditLogs = repo.getAdminAuditLogsPaginated({ limit: 1 }).pagination.total;
    const traffic = repo.getPageViewMetrics();
    const perf = repo.getPerformanceMetricsSummary();

    const isClean = scans === 0 && traffic.totalViews === 0 && perf.totalRequests === 0;
    return {
      isClean,
      counts: {
        scans,
        securityLogs: secLogs,
        auditLogs,
        pageViews: traffic.totalViews,
        performanceMetrics: perf.totalRequests,
      },
    };
  }
}
