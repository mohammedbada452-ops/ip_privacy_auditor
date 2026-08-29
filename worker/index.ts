import { httpServerHandler } from 'cloudflare:node';
import { createApiApp } from '../server/app';
import { dbRepository } from '../server/db/repository';
import { PostgresRepository } from '../server/db/postgresRepository';
import { runMigrations } from '../server/db/migrationRunner';

type WorkerRuntimeEnv = Record<string, unknown>;

type RequestClient = {
  query: (text: string, params?: unknown[]) => Promise<any>;
  release: () => Promise<void> | void;
};

type RequestPoolAdapter = {
  connect: () => Promise<RequestClient>;
  query: (text: string, params?: unknown[]) => Promise<any>;
};

let initialized = false;
let initPromise: Promise<void> | null = null;
let expressWorkerHandler: ReturnType<typeof httpServerHandler> | null = null;

const INDEXABLE_PATHS = [
  '/',
  '/browser',
  '/headers',
  '/site-audit',
  '/privacy',
  '/learn',
];

function createSeoResponse(request: Request): Response | null {
  const pathname = new URL(request.url).pathname;
  if (pathname === '/robots.txt') {
    const origin = new URL(request.url).origin;
    const body = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /api/',
      `Sitemap: ${origin}/sitemap.xml`,
      '',
    ].join('\n');
    return new Response(body, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, max-age=3600',
      },
    });
  }
  if (pathname === '/sitemap.xml') {
    const origin = new URL(request.url).origin;
    const rows = INDEXABLE_PATHS.map((path) => `<url><loc>${origin}${path}</loc></url>`).join('');
    const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows}</urlset>`;
    return new Response(body, {
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': 'public, max-age=3600',
      },
    });
  }
  return null;
}

function resolveConnectionString(env: WorkerRuntimeEnv): string | undefined {
  const hyperdrive = env.HYPERDRIVE as { connectionString?: unknown } | undefined;
  const hyperdriveConnectionString =
    typeof hyperdrive?.connectionString === 'string' ? hyperdrive.connectionString.trim() : '';

  if (hyperdriveConnectionString) {
    return hyperdriveConnectionString;
  }

  const explicitDatabaseUrl = env.DATABASE_URL;
  return typeof explicitDatabaseUrl === 'string' && explicitDatabaseUrl.trim()
    ? explicitDatabaseUrl.trim()
    : undefined;
}

function createRequestPool(connectionString: string, pgMod: any): RequestPoolAdapter {
  return {
    async connect() {
      const client = new pgMod.Client({ connectionString });
      await client.connect();

      return {
        query: (text: string, params?: unknown[]) => client.query(text, params),
        release: async () => {
          try {
            await client.end();
          } catch {
            // Best-effort cleanup for request-scoped Cloudflare clients.
          }
        },
      };
    },

    async query(text: string, params?: unknown[]) {
      const client = await this.connect();
      try {
        return await client.query(text, params);
      } finally {
        await client.release();
      }
    },
  };
}

async function configurePostgresIfAvailable(env: WorkerRuntimeEnv): Promise<void> {
  const connectionString = resolveConnectionString(env);

  if (!connectionString) {
    console.warn(
      '[DATABASE] Worker started without PostgreSQL/Hyperdrive. Public audit APIs remain available in degraded mode; persistent/admin operations are unavailable.'
    );
    return;
  }

  // Cloudflare Workers exposes bindings through `env`; the application is built
  // around process.env, so mirror only the already-resolved server-side value.
  process.env.DATABASE_URL = connectionString;

  try {
    const pgMod = await import('pg');
    const pool = createRequestPool(connectionString, pgMod);

    const health = await pool.query('SELECT 1 AS healthy');
    if (health?.rows?.[0]?.healthy !== 1) {
      throw new Error('PostgreSQL health check returned an unexpected result.');
    }

    // Run the same versioned schema migrations used by the native Node server.
    // The adapter opens a fresh PostgreSQL client for each operation, which is
    // compatible with Hyperdrive's recommended Worker usage.
    await runMigrations(pool as unknown as import('pg').Pool);

    dbRepository.setPostgresRepository(
      new PostgresRepository(pool as unknown as import('pg').Pool)
    );

    console.log('[DATABASE] Worker PostgreSQL/Hyperdrive persistence is ready.');
  } catch (error) {
    // Do not make the entire public application unavailable because a persistence
    // dependency is down. Public audit calculations are pure/request-scoped and
    // can continue; /api/healthz and admin operations will report degraded state.
    dbRepository.setPostgresRepository(null);
    console.error(
      '[DATABASE] Worker PostgreSQL initialization failed; continuing in degraded mode:',
      error instanceof Error ? error.message : String(error)
    );
  }
}

function productionPersistenceGuard(req: any, res: any, next: any): void {
  const isAdminRequest = typeof req.path === 'string' && req.path.startsWith('/api/admin');
  if (
    isAdminRequest &&
    process.env.NODE_ENV === 'production' &&
    !dbRepository.isPostgresActive()
  ) {
    res.status(503).json({
      success: false,
      error: {
        code: 'PERSISTENCE_UNAVAILABLE',
        message: 'Administrative persistence is temporarily unavailable. Public audit endpoints remain available.',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'req_persistence_unavailable',
      },
    });
    return;
  }

  next();
}

async function initializeWorkerIfNeeded(env: WorkerRuntimeEnv = {}): Promise<void> {
  // Mark this process as running behind Cloudflare's edge bridge. This flag is used
  // only to trust the Worker-generated request metadata headers below.
  process.env.PRIVASEC_CLOUDFLARE_EDGE = 'true';
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await configurePostgresIfAvailable(env);

      const app = createApiApp({
        includeErrorHandler: true,
        beforeRoutes: productionPersistenceGuard,
      });

      // Express-on-Workers is intentionally started once and adapted to the
      // Workers fetch interface using Cloudflare's official bridge.
      app.listen(8787);
      expressWorkerHandler = httpServerHandler({ port: 8787 });
      initialized = true;
    } catch (error) {
      initialized = false;
      throw error;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

function createExpressBridgeRequest(request: Request): Request {
  const headers = new Headers(request.headers);
  const cf = (request as Request & { cf?: Record<string, unknown> }).cf || {};
  const observedIp = request.headers.get('CF-Connecting-IP') || '';
  const internalKeys = [
    'X-Privasec-Observed-IP',
    'X-Privasec-CF-Country',
    'X-Privasec-CF-Region',
    'X-Privasec-CF-City',
    'X-Privasec-CF-Postal-Code',
    'X-Privasec-CF-Timezone',
    'X-Privasec-CF-ASN',
    'X-Privasec-CF-AS-Organization',
    'X-Privasec-CF-Latitude',
    'X-Privasec-CF-Longitude',
  ];
  // Remove any client-supplied internal headers before the Worker writes authoritative edge observations.
  for (const key of internalKeys) headers.delete(key);
  const setInternal = (key: string, value: unknown) => {
    if (value !== undefined && value !== null && String(value).trim()) headers.set(key, String(value));
  };

  if (observedIp) headers.set('X-Privasec-Observed-IP', observedIp);
  setInternal('X-Privasec-CF-Country', cf.country);
  setInternal('X-Privasec-CF-Region', cf.region);
  setInternal('X-Privasec-CF-City', cf.city);
  setInternal('X-Privasec-CF-Postal-Code', cf.postalCode);
  setInternal('X-Privasec-CF-Timezone', cf.timezone);
  setInternal('X-Privasec-CF-ASN', cf.asn);
  setInternal('X-Privasec-CF-AS-Organization', cf.asOrganization);
  setInternal('X-Privasec-CF-Latitude', cf.latitude);
  setInternal('X-Privasec-CF-Longitude', cf.longitude);

  return new Request(request, { headers });
}

async function handleRequest(request: Request, env: WorkerRuntimeEnv, ctx: any): Promise<Response> {
  const seoResponse = createSeoResponse(request);
  if (seoResponse) return seoResponse;

  if (!initialized) {
    await initializeWorkerIfNeeded(env);
  }

  const handler = expressWorkerHandler;
  if (!handler || typeof handler.fetch !== 'function') {
    throw new Error('Express Worker handler is not initialized.');
  }

  // Cloudflare's generated Node handler types vary slightly by Wrangler/workerd
  // release; runtime values are the standard Worker handler contract. Keep this
  // boundary typed locally without changing request/response behavior.
  return (handler.fetch as any)(
    createExpressBridgeRequest(request) as any,
    env as any,
    ctx as any
  );
}

export default {
  fetch: handleRequest,
};

export async function fetch(
  request: Request,
  env: WorkerRuntimeEnv,
  ctx: any
): Promise<Response> {
  return handleRequest(request, env, ctx);
}
