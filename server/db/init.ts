import { initPool, getPool, isPostgresAvailable, sanitizeDatabaseUrl } from './postgres';
import { runMigrations } from './migrationRunner';
import { PostgresRepository } from './postgresRepository';
import { dbRepository } from './repository';
import { getAdminAuthConfig } from '../config';
import { getRequestEnv } from '../config/requestEnv';

export interface DatabaseInitResult {
  status: 'connected' | 'fallback_development' | 'failed';
  migrationsApplied?: number;
  currentSchemaVersion?: number;
  error?: string;
}

/**
 * Initializes database subsystem.
 * In production or when DATABASE_URL is set:
 * 1. Initializes connection pool
 * 2. Runs versioned migrations
 * 3. Configures PostgreSQL repository
 * 4. Bootstraps environment admin credentials
 */
export async function initializeDatabase(databaseUrlOverride?: string): Promise<DatabaseInitResult> {
  const isProduction = getRequestEnv('NODE_ENV') === 'production';
  const databaseUrl = databaseUrlOverride || getRequestEnv('DATABASE_URL');

  if (!databaseUrl) {
    if (isProduction) {
      console.warn('[DATABASE] WARNING: DATABASE_URL is not set in production. Persistent PostgreSQL storage is inactive.');
      return {
        status: 'failed',
        error: 'DATABASE_URL not configured in production.',
      };
    } else {
      console.log('[DATABASE] Notice: DATABASE_URL not set. Operating in DEVELOPMENT-ONLY in-memory fallback mode.');
      return {
        status: 'fallback_development',
      };
    }
  }

  try {
    console.log(`[DATABASE] Connecting to PostgreSQL at ${sanitizeDatabaseUrl(databaseUrl)}...`);
    const pool = initPool({ connectionString: databaseUrl });
    const isHealthy = await isPostgresAvailable(pool);

    if (!isHealthy) {
      throw new Error('PostgreSQL connection check failed. Server unreachable or rejected connection.');
    }

    console.log('[DATABASE] PostgreSQL connection established. Executing schema migrations...');
    const migrationResult = await runMigrations(pool);
    console.log(`[DATABASE] Migrations complete. Applied: ${migrationResult.applied}, Current version: ${migrationResult.currentVersion}`);

    // Initialize PostgreSQL repository and link to global repository
    const postgresRepo = new PostgresRepository(pool);
    dbRepository.setPostgresRepository(postgresRepo);

    // Bootstrap admin credentials if configured
    try {
      const authConfig = getAdminAuthConfig();
      if (authConfig.adminUsername && authConfig.adminPassword) {
        await postgresRepo.bootstrapAdminCredentials(authConfig.adminUsername, authConfig.adminPassword);
        console.log(`[DATABASE] Admin credentials bootstrapped into PostgreSQL for user '${authConfig.adminUsername}'.`);
      }
    } catch (bootstrapErr) {
      const message = (bootstrapErr as Error).message;
      console.error('[DATABASE] Admin bootstrap failed:', message);
      if (isProduction) throw bootstrapErr;
    }

    return {
      status: 'connected',
      migrationsApplied: migrationResult.applied,
      currentSchemaVersion: migrationResult.currentVersion,
    };
  } catch (err) {
    const errorMsg = (err as Error).message;
    console.error('[DATABASE] PostgreSQL initialization failed:', errorMsg);
    if (isProduction) {
      return {
        status: 'failed',
        error: errorMsg,
      };
    } else {
      return {
        status: 'fallback_development',
        error: errorMsg,
      };
    }
  }
}
