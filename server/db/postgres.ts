import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

export interface DatabasePoolConfig {
  connectionString?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

let globalPool: pg.Pool | null = null;
let isShuttingDown = false;

/**
 * Sanitizes a database connection URL for safe logging/diagnostics without exposing passwords.
 */
export function sanitizeDatabaseUrl(url?: string): string {
  if (!url) return '[NOT_CONFIGURED]';
  if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) {
    return '[INVALID_URL_FORMAT]';
  }
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '******';
    }
    return parsed.toString();
  } catch {
    return '[INVALID_URL_FORMAT]';
  }
}

/**
 * Hash session token using SHA-256 for secure database storage.
 * The raw token is NEVER persisted to the database.
 */
export function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Initialize PostgreSQL connection pool.
 */
export function initPool(config?: DatabasePoolConfig): pg.Pool {
  if (globalPool && !isShuttingDown) {
    return globalPool;
  }

  const connectionString = config?.connectionString || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const isSslRequired = connectionString.includes('sslmode=require') || connectionString.includes('ssl=true');

  const poolConfig: pg.PoolConfig = {
    connectionString,
    max: config?.max || (isProduction ? 20 : 10),
    idleTimeoutMillis: config?.idleTimeoutMillis || 30000,
    connectionTimeoutMillis: config?.connectionTimeoutMillis || 5000,
    ssl: config?.ssl ?? (isSslRequired ? { rejectUnauthorized: false } : undefined),
  };

  const pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    // Unexpected error on idle client
    console.error('Unexpected error on idle PostgreSQL client:', err.message);
  });

  globalPool = pool;
  return pool;
}

/**
 * Retrieve the active PostgreSQL connection pool instance if initialized.
 */
export function getPool(): pg.Pool | null {
  return globalPool;
}

/**
 * Checks if the PostgreSQL connection pool is healthy and reachable.
 */
export async function isPostgresAvailable(poolOverride?: pg.Pool): Promise<boolean> {
  const pool = poolOverride || globalPool;
  if (!pool) return false;

  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT 1 AS healthy');
      return res.rows.length > 0 && res.rows[0].healthy === 1;
    } finally {
      client.release();
    }
  } catch {
    return false;
  }
}

/**
 * Executes a callback within a managed PostgreSQL transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK on error.
 */
export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>,
  poolOverride?: pg.Pool
): Promise<T> {
  const pool = poolOverride || globalPool;
  if (!pool) {
    throw new Error('Database connection pool is not initialized.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Error during transaction rollback:', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Executes a callback within a managed PostgreSQL transaction using a single, already-connected
 * `pg.Client` (as opposed to `withTransaction`, which checks a client OUT of a `pg.Pool`).
 *
 * This exists for the Cloudflare Worker request lifecycle: each request creates exactly one
 * `pg.Client` against Hyperdrive (see `worker/index.ts`), and every read, write, and transaction
 * for that request must run on that same connection. There is no separate connect()/release()
 * step here because the Client passed in already IS the connection for the current request -
 * checking out a "different" connection would defeat the purpose of request-scoping and risks
 * the exact cross-request I/O sharing bug this design avoids. The caller (worker/index.ts) owns
 * connecting the client before use and closing it in a `finally` after the request completes.
 */
export async function withClientTransaction<T>(
  callback: (client: pg.Client) => Promise<T>,
  client: pg.Client
): Promise<T> {
  await client.query('BEGIN');
  try {
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Error during transaction rollback:', rollbackErr);
    }
    throw err;
  }
}

/**
 * Closes the active PostgreSQL connection pool gracefully.
 */
export async function closePool(): Promise<void> {
  if (globalPool) {
    isShuttingDown = true;
    try {
      await globalPool.end();
    } finally {
      globalPool = null;
      isShuttingDown = false;
    }
  }
}
