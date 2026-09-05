import { adminAuthService } from "../server/services/adminAuthService";
import { dbRepository } from "../server/db/repository";
import { hasPermission, type AdminPermission } from "../server/auth/rbac";
import { privacyService } from "../server/services/privacyService";
import { geoIPService } from "../server/services/geoip";
import { ipReputationService } from "../server/services/ipReputation";
import { rdapService } from "../server/services/rdap";
import { reverseDnsService } from "../server/services/reverseDns";
import { HeaderCollector, HeaderClassifier } from "../server/headers";
import { extractClientIp, validateIp } from "../server/utils/ipExtractor";
import { CloudflareRequestCfProvider } from "../server/providers/geoip/CloudflareRequestCfProvider";
import { getRequestEnv, runWithRequestEnv, type RequestEnvValues } from "../server/config/requestEnv";
import { validateBrowserFingerprintPayload, PayloadValidationError } from "../server/utils/payloadValidator";

type RuntimeEnv = {
  ASSETS?: Fetcher;
  HYPERDRIVE?: { connectionString?: string };
  DATABASE_URL?: string;
  NODE_ENV?: string;
  CORS_ALLOWED_ORIGINS?: string;
  SERVER_SECRET_SALT?: string;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SECRET_KEY?: string;
  IPINFO_TOKEN?: string;
  ABUSEIPDB_API_KEY?: string;
  GEOIP_PROVIDER?: string;
  GEOIP_API_KEY?: string;
  TRUST_LOCAL_PROXY?: string;
  TRUSTED_PROXIES?: string;
  TRUSTED_PROXY_CIDRS?: string;
  TRUST_PROXY?: string;
  DISABLE_RATE_LIMIT?: string;
  APP_ENV?: string;
  PORT?: string;
  [key: string]: unknown;
};

type ServiceRequest = {
  method: string;
  path: string;
  protocol: string;
  headers: Record<string, string | string[] | undefined>;
  rawHeaders: string[];
  query: Record<string, string>;
  body: unknown;
  requestId: string;
  ip?: string;
  socket?: { remoteAddress?: string };
  get(name: string): string | undefined;
};

/**
 * Builds the request-scoped configuration values read from Worker env bindings. This is a pure
 * function - it returns a plain object and writes nothing to `process.env` or any other global,
 * so it cannot be observed by, or leak into, a different concurrent request. See
 * `runWithRequestEnv` (server/config/requestEnv.ts), which scopes this object to exactly one
 * request via AsyncLocalStorage; consumers (`getAdminAuthConfig()`, `adminAuthService`,
 * `PostgresRepository`, `geoip.ts`, `ipReputation.ts`, `ipExtractor.ts`, etc.) were updated to
 * read through `getRequestEnv()` instead of `process.env` directly.
 *
 * `DATABASE_URL` and `CORS_ALLOWED_ORIGINS` are intentionally not included here: nothing
 * reachable from the Worker request path reads `process.env.DATABASE_URL` (the connection
 * string is passed directly into `new pg.Client({ connectionString })` in
 * `createRequestDatabase` below) or `process.env.CORS_ALLOWED_ORIGINS` (`applyCors` below already
 * reads `env.CORS_ALLOWED_ORIGINS` directly) - both were dead writes.
 */
function buildRequestEnvValues(env: RuntimeEnv): RequestEnvValues {
  const values: RequestEnvValues = {
    NODE_ENV: env.NODE_ENV || "production",
    PRIVASEC_CLOUDFLARE_EDGE: "true",
  };
  if (typeof env.SERVER_SECRET_SALT === "string") values.SERVER_SECRET_SALT = env.SERVER_SECRET_SALT;
  if (typeof env.ADMIN_USERNAME === "string") values.ADMIN_USERNAME = env.ADMIN_USERNAME;
  if (typeof env.ADMIN_PASSWORD === "string") values.ADMIN_PASSWORD = env.ADMIN_PASSWORD;
  if (typeof env.ADMIN_SECRET_KEY === "string") values.ADMIN_SECRET_KEY = env.ADMIN_SECRET_KEY;
  if (typeof env.IPINFO_TOKEN === "string") values.IPINFO_TOKEN = env.IPINFO_TOKEN;
  if (typeof env.ABUSEIPDB_API_KEY === "string") values.ABUSEIPDB_API_KEY = env.ABUSEIPDB_API_KEY;
  if (typeof env.GEOIP_PROVIDER === "string") values.GEOIP_PROVIDER = env.GEOIP_PROVIDER;
  if (typeof env.GEOIP_API_KEY === "string") values.GEOIP_API_KEY = env.GEOIP_API_KEY;
  if (typeof env.TRUST_LOCAL_PROXY === "string") values.TRUST_LOCAL_PROXY = env.TRUST_LOCAL_PROXY;
  if (typeof env.TRUSTED_PROXIES === "string") values.TRUSTED_PROXIES = env.TRUSTED_PROXIES;
  if (typeof env.TRUSTED_PROXY_CIDRS === "string") values.TRUSTED_PROXY_CIDRS = env.TRUSTED_PROXY_CIDRS;
  if (typeof env.TRUST_PROXY === "string") values.TRUST_PROXY = env.TRUST_PROXY;
  if (typeof env.DISABLE_RATE_LIMIT === "string") values.DISABLE_RATE_LIMIT = env.DISABLE_RATE_LIMIT;
  if (typeof env.APP_ENV === "string") values.APP_ENV = env.APP_ENV;
  if (typeof env.PORT === "string") values.PORT = env.PORT;
  if (typeof env.DATABASE_URL === "string") values.DATABASE_URL = env.DATABASE_URL;
  if (typeof env.CORS_ALLOWED_ORIGINS === "string") values.CORS_ALLOWED_ORIGINS = env.CORS_ALLOWED_ORIGINS;
  return values;
}

/**
 * Per-isolate fast-path cache: once a request has confirmed (via `runMigrations`'s `upToDate`
 * result, itself computed from a real query against `schema_migrations`)
 * that the schema is fully current, later requests on the same warm isolate skip the migration
 * check entirely - no query, no lock, no round trip.
 *
 * This flag is NOT the concurrency-safety mechanism - it only ever *skips* work, never
 * *replaces* the safety check. Correctness under concurrent requests/isolates comes entirely
 * from the idempotent migration logic inside `runMigrations` (server/db/migrationRunner.ts),
 * which remains safe under concurrent invocation - including the
 * very first requests after a cold start or a new deployment, when multiple concurrent requests
 * may each see `migrationsVerified === false` and each call `runMigrations`. A stale `false`
 * (e.g. after an isolate restart) only ever causes one redundant-but-safe re-check; it can never
 * cause a migration to be skipped or a race to reappear.
 */
let migrationsVerified = false;

/**
 * Creates a brand-new, single-use PostgreSQL connection for exactly one Worker request, per
 * Cloudflare's documented Hyperdrive + node-postgres pattern: "Create a new client instance
 * for each request. Hyperdrive maintains the underlying database connection pool, so creating
 * a new client is fast."
 * (https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/node-postgres/)
 *
 * This function never reads or writes any module-level variable except the `migrationsVerified`
 * read/write documented above (a plain boolean fact, not a connection or I/O object). Nothing
 * else it creates outlives the request that calls it. The caller is responsible for closing
 * `client` in a `finally` block once the request has finished (see `handleRequestSafely` below),
 * and for scoping `repo` to this request only via `dbRepository.runWithRequestScopedRepository`.
 *
 * Must be called from inside the `runWithRequestEnv(...)` scope established by
 * `handleRequestSafely`, since `PostgresRepository`'s constructor reads `getRequestEnv(...)`.
 */
async function createRequestDatabase(env: RuntimeEnv): Promise<{ client: import("pg").Client | null; repo: import("../server/db/postgresRepository").PostgresRepository | null }> {
  const connectionString = env.HYPERDRIVE?.connectionString?.trim() || (typeof env.DATABASE_URL === "string" ? env.DATABASE_URL.trim() : "");
  if (!connectionString) return { client: null, repo: null };

  const pg = await import("pg");
  const client = new pg.default.Client({ connectionString });

  try {
    await client.connect();
    const health = await client.query("SELECT 1 AS healthy");
    if (health.rows?.[0]?.healthy !== 1) throw new Error("PostgreSQL health check failed");

    const [{ PostgresRepository }, { runMigrations }] = await Promise.all([
      import("../server/db/postgresRepository"),
      import("../server/db/migrationRunner"),
    ]);

    if (!migrationsVerified) {
      // Multiple concurrent requests may reach this branch during a cold start.
      // runMigrations is designed to be idempotent for concurrent invocation.
      const result = await runMigrations(client);
      if (result.upToDate) migrationsVerified = true;
    }

    return { client, repo: new PostgresRepository(client) };
  } catch (error) {
    console.error("[DATABASE] Per-request connection failed; this request continues without persistence:", error instanceof Error ? error.message : String(error));
    await client.end().catch(() => {});
    return { client: null, repo: null };
  }
}

const NON_INDEXABLE_PATHS = ['/admin', '/admin/dashboard', '/design-system'];

const INDEXABLE_PATHS = [
  "/",
  "/browser",
  "/headers",
  "/privacy",
  "/learn",
];

function requestId(): string {
  return `req_${crypto.randomUUID().replaceAll("-", "")}`;
}

function buildServiceRequest(request: Request, env: RuntimeEnv): ServiceRequest {
  const url = new URL(request.url);
  const headers: Record<string, string | undefined> = {};
  for (const [key, value] of request.headers.entries()) headers[key.toLowerCase()] = value;

  const cf = (request as Request & { cf?: Record<string, unknown> }).cf || {};
  const observedIp = request.headers.get("CF-Connecting-IP") || "";

  // These internal headers are written exclusively from authoritative Worker context.
  if (observedIp) headers["x-privasec-observed-ip"] = observedIp;
  const cfMap: Array<[string, unknown]> = [
    ["x-privasec-cf-country", cf.country],
    ["x-privasec-cf-region", cf.region],
    ["x-privasec-cf-city", cf.city],
    ["x-privasec-cf-postal-code", cf.postalCode],
    ["x-privasec-cf-timezone", cf.timezone],
    ["x-privasec-cf-asn", cf.asn],
    ["x-privasec-cf-as-organization", cf.asOrganization],
    ["x-privasec-cf-latitude", cf.latitude],
    ["x-privasec-cf-longitude", cf.longitude],
  ];
  for (const [key, value] of cfMap) {
    if (value !== undefined && value !== null && String(value).trim()) headers[key] = String(value);
  }

  const rawHeaders: string[] = [];
  for (const [key, value] of request.headers.entries()) rawHeaders.push(key, value);
  const query: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) query[key] = value;

  const serviceRequest: ServiceRequest = {
    method: request.method,
    path: url.pathname,
    protocol: url.protocol.replace(":", ""),
    headers,
    rawHeaders,
    query,
    body: undefined,
    requestId: requestId(),
    ip: observedIp || undefined,
    socket: { remoteAddress: observedIp || undefined },
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  };

  void env;
  return serviceRequest;
}

async function readJsonBody(request: Request, maxBytes = 100 * 1024): Promise<unknown> {
  const contentType = (request.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") return {};
  if (!contentType || (!contentType.includes("json") && contentType !== "application/x-www-form-urlencoded")) return {};

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) throw new Error("PAYLOAD_TOO_LARGE");

  if (!request.body) return {};

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error("PAYLOAD_TOO_LARGE");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  if (!text.trim()) return {};

  if (contentType.includes("json")) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("INVALID_JSON");
    }
  }

  return Object.fromEntries(new URLSearchParams(text).entries());
}

function jsonResponse(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extraHeaders,
  });
  return new Response(JSON.stringify(data), { status, headers });
}

async function handleCountryFlag(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  const pathname = new URL(request.url).pathname;
  const match = pathname.match(/^\/api\/flag\/([a-z]{2})$/i);
  if (!match) return new Response("Not Found", { status: 404 });

  const code = match[1].toLowerCase();
  const upstreamUrl = `https://flagcdn.com/w80/${code}.png`;
  const cacheKey = new Request(upstreamUrl, { method: "GET" });
  // Cloudflare Workers exposes `caches.default`; the DOM CacheStorage type does not.
  const edgeCache = (caches as CacheStorage & { default: Cache }).default;

  const cached = await edgeCache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set("cache-control", "public, max-age=86400, s-maxage=604800, immutable");
    headers.set("x-privasec-flag-source", "server-proxy-cache");
    return request.method === "HEAD"
      ? new Response(null, { status: cached.status, headers })
      : new Response(cached.body, { status: cached.status, headers });
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Accept: "image/png" },
    });
    if (!upstream.ok || !upstream.body) {
      return new Response("Flag Not Found", { status: upstream.status || 404 });
    }

    const headers = new Headers({
      "content-type": upstream.headers.get("content-type") || "image/png",
      "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
      "x-content-type-options": "nosniff",
      "x-privasec-flag-source": "server-proxy",
    });
    const response = new Response(upstream.body, { status: 200, headers });
    await edgeCache.put(cacheKey, response.clone());

    return request.method === "HEAD"
      ? new Response(null, { status: 200, headers })
      : response;
  } catch {
    return new Response("Flag unavailable", { status: 502 });
  }
}

function applyPerformanceHeaders(response: Response, startedAt: number, request?: Request): Response {
  const headers = new Headers(response.headers);
  const durationMs = Math.max(0, Number((performance.now() - startedAt).toFixed(1)));
  if (getRequestEnv("NODE_ENV") !== "production") {
    headers.set("Server-Timing", `app;dur=${durationMs}`);
  } else {
    headers.delete("Server-Timing");
  }
  if (request) headers.set("X-Request-ID", request.headers.get("X-Privasec-Request-ID") || headers.get("X-Request-ID") || "");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function applyStaticCacheHeaders(request: Request, response: Response): Response {
  const pathname = new URL(request.url).pathname;
  if (request.method !== "GET" && request.method !== "HEAD") return response;
  if (response.status !== 200) return response;
  if (!pathname.startsWith("/assets/")) return response;
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Download-Options", "noopen");
  headers.set("X-DNS-Prefetch-Control", "off");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https:; connect-src 'self' wss:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"
  );
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function applyCors(request: Request, response: Response, env: RuntimeEnv): Response {
  const origin = request.headers.get("Origin");
  if (!origin) return response;
  const url = new URL(request.url);
  const configured = typeof env.CORS_ALLOWED_ORIGINS === "string"
    ? env.CORS_ALLOWED_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean)
    : [];
  const allowed = configured.length > 0 ? configured.includes(origin) : origin === url.origin;
  if (!allowed) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Vary", "Origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function apiMeta(req: ServiceRequest) {
  return { timestamp: new Date().toISOString(), requestId: req.requestId, version: "1.0.0" };
}

function publicError(req: ServiceRequest, code: string, message: string, status: number, extra?: Record<string, unknown>) {
  return jsonResponse({ success: false, error: { code, message, ...(extra || {}) }, meta: apiMeta(req) }, status);
}

const PUBLIC_API_LIMIT = { windowMs: 60_000, max: 120 };
const HEAVY_API_LIMIT = { windowMs: 60_000, max: 30 };
const SCORE_API_LIMIT = { windowMs: 60_000, max: 60 };

const MAX_ADMIN_PAGE = 100_000;
const MAX_ADMIN_LIMIT = 100;
const MAX_ADMIN_SEARCH_LENGTH = 200;

function boundedPositiveInt(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, parsed));
}

function boundedSearch(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  return normalized.slice(0, MAX_ADMIN_SEARCH_LENGTH);
}

async function rateLimit(req: ServiceRequest, bucket: string, windowMs: number, max: number): Promise<Response | null> {
  try {
    const result = await dbRepository.consumeApiRateLimitAsync(`${bucket}:${extractClientIp(req as any).ip}`, windowMs, max);
    if (result.isLimited) {
      return jsonResponse(
        { success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please retry shortly.", retryAfterSeconds: result.retryAfterSeconds }, meta: apiMeta(req) },
        429,
        { "Retry-After": String(result.retryAfterSeconds), "X-RateLimit-Limit": String(max), "X-RateLimit-Remaining": "0" },
      );
    }
    return null;
  } catch (error) {
    // Previously this catch block was empty (`catch {}`), silently discarding the real error.
    // That made RATE_LIMITER_UNAVAILABLE unactionable in `wrangler tail`. Now that every request
    // gets its own freshly-connected database client (see createRequestDatabase), a failure here
    // is a genuine query/connectivity problem for this request, not a stale shared connection -
    // there is nothing left to reset, so we just log it and degrade this request's response.
    console.error("[RATE_LIMITER] consumeApiRateLimitAsync failed:", error instanceof Error ? error.message : String(error));
    return getRequestEnv("NODE_ENV") === "production"
      ? publicError(req, "RATE_LIMITER_UNAVAILABLE", "Traffic protection is temporarily unavailable. Please retry shortly.", 503)
      : null;
  }
}

function cookieValue(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("Cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.split("=");
    if (key?.trim() === name) {
      const value = rest.join("=").trim();
      try { return decodeURIComponent(value); } catch { return value; }
    }
  }
  return undefined;
}

async function hasValidCsrfToken(request: Request): Promise<boolean> {
  const cookieToken = cookieValue(request, "privasec_admin_csrf") || "";
  const headerToken = request.headers.get("x-csrf-token") || "";
  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length) return false;
  const cookieBuffer = new TextEncoder().encode(cookieToken);
  const headerBuffer = new TextEncoder().encode(headerToken);
  if (cookieBuffer.length !== headerBuffer.length) return false;
  // Web Crypto in Cloudflare Workers does not expose Node's timingSafeEqual.
  // Compare equal-length byte arrays without an early exit.
  let diff = 0;
  for (let i = 0; i < cookieBuffer.length; i++) diff |= cookieBuffer[i] ^ headerBuffer[i];
  return diff === 0;
}

function cookieHeader(name: string, value: string, options: { httpOnly?: boolean; secure?: boolean; sameSite?: string; path?: string; maxAge?: number } = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  return parts.join("; ");
}

async function requireAdmin(req: ServiceRequest, permission?: AdminPermission) {
  const session = await adminAuthService.validateTokenAsync(req as any);
  if (!session) return { response: publicError(req, "UNAUTHORIZED", "Administrator authentication required.", 401) };
  if (permission && !hasPermission(session.role, permission)) return { response: publicError(req, "FORBIDDEN", "Your administrator role is not permitted to access this resource.", 403) };
  return { session };
}

async function handleApi(request: Request, env: RuntimeEnv, ctx: ExecutionContext): Promise<Response> {
  const req = buildServiceRequest(request, env);
  let body: unknown = {};
  try {
    body = await readJsonBody(request);
    req.body = body;
  } catch (error) {
    if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") return publicError(req, "PAYLOAD_TOO_LARGE", "Request body is too large.", 413);
    return publicError(req, "INVALID_BODY", "The request body is invalid.", 400);
  }

  const p = req.path;
  const method = req.method.toUpperCase();

  if (method === "OPTIONS") return new Response(null, { status: 204 });

  if (p === "/api/health/live" && method === "GET") {
    return jsonResponse({ success: true, data: { status: "ok", service: "privacy-intelligence-auditor-api" } });
  }

  if (p === "/api/health/ready" && method === "GET") {
    const postgres = dbRepository.getPostgresRepository();
    if (!postgres) return jsonResponse({ success: false, data: { status: "not-ready", database: "unavailable" }, meta: apiMeta(req) }, 503);
    const healthy = await postgres.checkHealth();
    return jsonResponse({ success: healthy, data: { status: healthy ? "ready" : "not-ready", database: healthy ? "ok" : "unavailable" }, meta: apiMeta(req) }, healthy ? 200 : 503);
  }

  if (p === "/api/healthz" && method === "GET") {
    const postgres = dbRepository.getPostgresRepository();
    const healthy = getRequestEnv("NODE_ENV") !== "production" ? true : Boolean(postgres && await postgres.checkHealth());
    return jsonResponse({
      success: healthy,
      data: { status: healthy ? "ok" : "unhealthy", uptime: 0, timestamp: new Date().toISOString(), service: "privacy-intelligence-auditor-api", environment: getRequestEnv("NODE_ENV") || "production" },
      meta: apiMeta(req),
    }, healthy ? 200 : 503);
  }

  if (p === "/api/ip" && method === "GET") {
    const limited = await rateLimit(req, "ip", PUBLIC_API_LIMIT.windowMs, PUBLIC_API_LIMIT.max);
    if (limited) return limited;
    const extracted = extractClientIp(req as any);
    return jsonResponse({ success: true, data: {
      ip: extracted.ip,
      ipVersion: extracted.version,
      isPrivate: extracted.isPrivate,
      headers: {
        userAgent: req.headers["user-agent"] || null,
        secGpc: req.headers["sec-gpc"] || null,
        dnt: req.headers["dnt"] || null,
        acceptLanguage: req.headers["accept-language"] || null,
        connection: req.headers["connection"] || null,
      },
      connectionFlags: { hasProxyHeaders: extracted.hasProxyHeaders, isInfrastructureProxy: extracted.isInfrastructureProxy, viaHeader: extracted.viaHeader },
      publicIpStatus: extracted.isPublic && extracted.isAuthoritativeForClientEgress ? "MEASURED" : "NOT_MEASURED",
      ipSource: extracted.ipSource,
      connectionType: extracted.connectionType,
      localAddress: extracted.localAddress,
      publicIp: extracted.publicIp,
      publicIpConfidence: extracted.publicIpConfidence,
      classification: extracted.observationScope,
      observationSource: extracted.observationSource,
      isAuthoritativeForClientEgress: extracted.isAuthoritativeForClientEgress,
    }, meta: apiMeta(req) });
  }

  if (p === "/api/ip/network-intelligence" && method === "GET") {
    const limited = await rateLimit(req, "network-intelligence", HEAVY_API_LIMIT.windowMs, HEAVY_API_LIMIT.max);
    if (limited) return limited;
    const queryIp = req.query.ip?.trim();
    if (queryIp && queryIp.length > 64) return publicError(req, "INVALID_IP", "Provided IP address is not valid.", 400);
    const targetIp = queryIp || extractClientIp(req as any).ip;
    const validation = validateIp(targetIp);
    if (!validation.isValid) return publicError(req, "INVALID_IP", "Provided IP address is not valid.", 400);

    const normalizedIp = validation.normalizedIp;
    const cfDetails = !queryIp ? await new CloudflareRequestCfProvider(req.headers as any).lookup(normalizedIp).catch(() => null) : null;
    const [multiSource, reputation, rdap, reverseDns] = await Promise.all([
      geoIPService.getMultiSourceDetails(normalizedIp).catch((error) => ({ error: error instanceof Error ? error.message : "GeoIP unavailable" })),
      ipReputationService.lookup(normalizedIp).catch(() => ({ ip: normalizedIp, status: "ERROR", provider: null, abuseConfidenceScore: null, totalReports: null, lastReportedAt: null, usageType: null, isWhitelisted: null, countryCode: null, domain: null, confidence: "UNKNOWN", note: "Reputation lookup failed." })),
      rdapService.lookup(normalizedIp),
      reverseDnsService.lookup(normalizedIp),
    ]);

    if ("error" in multiSource) {
      return jsonResponse({ success: true, data: {
        ip: normalizedIp,
        geo: { country: "Unavailable", countryCode: "XX", region: "", city: "", postalCode: "", latitude: null, longitude: null, timezone: "" },
        network: { isp: "Unavailable", organization: "Unavailable", asn: "—", isMobile: null, isProxy: null, isVpn: null, isTor: null, isHosting: null, provider: "UNAVAILABLE", providerStatus: "UNAVAILABLE" },
        reputation, rdap, reverseDns, intelligenceConfidence: "LOW", providers: ["RDAP", reverseDns.resolver || "Cloudflare DNS over HTTPS"], providerObservations: [], consensus: { countryCode: null, asn: null, agreement: "NONE" },
        note: "Primary GeoIP data is unavailable; auxiliary intelligence is reported separately."
      }, meta: apiMeta(req) });
    }

    const details = multiSource.primary;
    const providers = [details.network.provider || "GeoIP"];
    if (cfDetails?.network.providerStatus === "VERIFIED") providers.push(cfDetails.network.provider);
    if (reputation.provider) providers.push(reputation.provider);
    if (rdap.source) providers.push(rdap.source);
    if (reverseDns.resolver) providers.push(reverseDns.resolver);

    const measured = [details.network.providerStatus === "VERIFIED", reputation.status === "MEASURED", rdap.status === "MEASURED", reverseDns.status === "MEASURED"].filter(Boolean).length;
    const intelligenceConfidence = measured >= 3 ? "HIGH" : measured >= 2 ? "MEDIUM" : measured >= 1 ? "LOW" : "UNKNOWN";

    return jsonResponse({ success: true, data: {
      ip: normalizedIp,
      geo: details.geo,
      network: details.network,
      reputation,
      rdap,
      reverseDns,
      intelligenceConfidence,
      providers: [...new Set(providers)],
      providerObservations: [...(cfDetails?.network.providerStatus === "VERIFIED" ? [{ provider: "Cloudflare Edge", status: "VERIFIED", countryCode: cfDetails.geo.countryCode || null, country: cfDetails.geo.country || null, asn: cfDetails.network.asn || null }] : []), ...multiSource.observations],
      consensus: multiSource.consensus,
      note: "Auxiliary network intelligence is independently sourced and does not change the canonical privacy score."
    }, meta: apiMeta(req) });
  }

  if (p === "/api/ip/reputation" && method === "GET") {
    const queryIp = req.query.ip?.trim();
    if (queryIp && queryIp.length > 64) return publicError(req, "INVALID_IP", "Provided IP address is not valid.", 400);
    const targetIp = queryIp || extractClientIp(req as any).ip;
    const validation = validateIp(targetIp);
    if (!validation.isValid) return publicError(req, "INVALID_IP", "Provided IP address is not valid.", 400);
    const limited = await rateLimit(req, "reputation", 60_000, 60);
    if (limited) return limited;
    return jsonResponse({ success: true, data: await ipReputationService.lookup(validation.normalizedIp), meta: apiMeta(req) });
  }

  if (p === "/api/ip/details" && method === "GET") {
    const limited = await rateLimit(req, "ip-details", SCORE_API_LIMIT.windowMs, SCORE_API_LIMIT.max);
    if (limited) return limited;
    const queryIp = req.query.ip?.trim();
    if (queryIp && queryIp.length > 64) return publicError(req, "INVALID_IP", "Provided IP address is not valid.", 400);
    const targetIp = queryIp || extractClientIp(req as any).ip;
    const validation = validateIp(targetIp);
    if (!validation.isValid) return publicError(req, "INVALID_IP", "Provided IP address is not valid.", 400);
    if (!validation.isPublic) return jsonResponse({ success: true, data: { ip: targetIp, measurementStatus: "NOT_MEASURED", geo: { country: "Not measured", countryCode: "XX", region: "Not measured", city: "Not measured", postalCode: "Not measured", latitude: null, longitude: null, timezone: "Unknown" }, network: { isp: "Not measured", organization: "Not measured", asn: "Not measured", isMobile: null, isProxy: null, isVpn: null, isTor: null, isHosting: null, provider: "NONE", providerStatus: "UNAVAILABLE" } }, meta: apiMeta(req) });
    // For the current client IP, combine authoritative Cloudflare edge metadata with a
    // real free GeoIP provider so VPN/proxy/hosting signals are measured when the provider
    // supplies them. Both lookups run in parallel and the provider is bounded by its own
    // 5-second timeout; the endpoint never waits on an unbounded external call.
    const [edgeDetails, providerDetails] = await Promise.all([
      new CloudflareRequestCfProvider(req.headers as any).lookup(validation.normalizedIp).catch(() => null),
      geoIPService.getDetails(validation.normalizedIp).catch(() => null),
    ]);

    const isMeaningful = (value: unknown) => {
      const text = String(value ?? '').trim();
      return Boolean(text && !/^(unknown|unavailable|not measured|not assigned|—|xx)$/i.test(text));
    };
    const pickText = (primary: unknown, secondary: unknown, fallback: string) =>
      isMeaningful(primary) ? String(primary).trim() : isMeaningful(secondary) ? String(secondary).trim() : fallback;
    const pickNumber = (primary: number | null | undefined, secondary: number | null | undefined) =>
      Number.isFinite(primary as number) ? primary : Number.isFinite(secondary as number) ? secondary : null;
    const pickBool = (primary: boolean | null | undefined, secondary: boolean | null | undefined) =>
      primary !== null && primary !== undefined ? primary : secondary !== null && secondary !== undefined ? secondary : null;

    const providerVerified = providerDetails?.network?.providerStatus === 'VERIFIED';
    const edgeVerified = edgeDetails?.network?.providerStatus === 'VERIFIED';
    const merged = providerVerified || edgeVerified
      ? {
          geo: {
            country: pickText(providerDetails?.geo.country, edgeDetails?.geo.country, 'Unknown'),
            countryCode: pickText(providerDetails?.geo.countryCode, edgeDetails?.geo.countryCode, 'XX').toUpperCase(),
            region: pickText(providerDetails?.geo.region, edgeDetails?.geo.region, ''),
            city: pickText(providerDetails?.geo.city, edgeDetails?.geo.city, ''),
            postalCode: pickText(providerDetails?.geo.postalCode, edgeDetails?.geo.postalCode, ''),
            latitude: pickNumber(providerDetails?.geo.latitude, edgeDetails?.geo.latitude),
            longitude: pickNumber(providerDetails?.geo.longitude, edgeDetails?.geo.longitude),
            timezone: pickText(providerDetails?.geo.timezone, edgeDetails?.geo.timezone, ''),
          },
          network: {
            isp: pickText(providerDetails?.network.isp, edgeDetails?.network.isp, 'Unavailable'),
            organization: pickText(providerDetails?.network.organization, edgeDetails?.network.organization, 'Unavailable'),
            asn: pickText(providerDetails?.network.asn, edgeDetails?.network.asn, '—'),
            asOrganization: pickText(providerDetails?.network.asOrganization, edgeDetails?.network.asOrganization, '') || null,
            isMobile: pickBool(providerDetails?.network.isMobile, edgeDetails?.network.isMobile),
            isProxy: pickBool(providerDetails?.network.isProxy, edgeDetails?.network.isProxy),
            isVpn: pickBool(providerDetails?.network.isVpn, edgeDetails?.network.isVpn),
            isTor: pickBool(providerDetails?.network.isTor, edgeDetails?.network.isTor),
            isHosting: pickBool(providerDetails?.network.isHosting, edgeDetails?.network.isHosting),
            privacyScore: providerDetails?.network.privacyScore ?? null,
            privacyGrade: providerDetails?.network.privacyGrade ?? null,
            networkType: providerDetails?.network.networkType ?? null,
            provider: providerDetails?.network.provider || edgeDetails?.network.provider || 'UNAVAILABLE',
            providerStatus: providerVerified ? 'VERIFIED' : edgeVerified ? 'VERIFIED' : 'UNAVAILABLE',
          },
        }
      : null;

    if (!merged) {
      return jsonResponse({
        success: true,
        data: {
          ip: validation.normalizedIp,
          measurementStatus: 'UNKNOWN',
          geo: { country: 'Unknown', countryCode: 'XX', region: '', city: '', postalCode: '', latitude: null, longitude: null, timezone: '' },
          network: { isp: 'Unavailable', organization: 'Unavailable', asn: '—', isMobile: null, isProxy: null, isVpn: null, isTor: null, isHosting: null, provider: 'UNAVAILABLE', providerStatus: 'UNAVAILABLE' },
        },
        meta: apiMeta(req),
      });
    }

    return jsonResponse({
      success: true,
      data: {
        ip: validation.normalizedIp,
        measurementStatus: merged.network.providerStatus === 'VERIFIED' ? 'MEASURED' : 'UNKNOWN',
        geo: merged.geo,
        network: merged.network,
      },
      meta: apiMeta(req),
    });
  }

  if ((p === "/api/headers" || p === "/api/check/headers") && method === "GET") {
    const limited = await rateLimit(req, "headers", PUBLIC_API_LIMIT.windowMs, PUBLIC_API_LIMIT.max);
    if (limited) return limited;
    const extracted = extractClientIp(req as any);
    const entries = HeaderCollector.collect(req as any);
    const analysis = HeaderClassifier.analyze(entries, extracted.isInfrastructureProxy);
    return jsonResponse({ success: true, data: { ...analysis, scoreScope: "HEADERS_ONLY" }, meta: apiMeta(req) });
  }

  if (p === "/api/headers/raw" && method === "GET") {
    const limited = await rateLimit(req, "headers-raw", PUBLIC_API_LIMIT.windowMs, PUBLIC_API_LIMIT.max);
    if (limited) return limited;
    const extracted = extractClientIp(req as any);
    const entries = HeaderCollector.collect(req as any);
    const analysis = HeaderClassifier.analyze(entries, extracted.isInfrastructureProxy);
    return new Response(analysis.rawExport.rawHttp, { status: 200, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }

  if (p === "/api/analyze/browser" && method === "POST") {
    const limited = await rateLimit(req, "browser-analysis", HEAVY_API_LIMIT.windowMs, HEAVY_API_LIMIT.max);
    if (limited) return limited;

    let fingerprint = null;
    try {
      fingerprint = validateBrowserFingerprintPayload((body as any)?.fingerprint ?? null);
    } catch (error) {
      if (error instanceof PayloadValidationError) {
        return publicError(req, "INVALID_PAYLOAD", error.message, 400);
      }
      console.error("[BROWSER_PAYLOAD] validation failed:", error instanceof Error ? error.message : String(error));
      return publicError(req, "INVALID_PAYLOAD", "The browser analysis payload is invalid.", 400);
    }

    try {
      const result = await privacyService.evaluateRequest(req as any, fingerprint);
      ctx.waitUntil?.(Promise.resolve());
      return jsonResponse({ success: true, data: result, meta: apiMeta(req) });
    } catch (error) {
      console.error("[BROWSER_ANALYSIS] failed:", error instanceof Error ? error.message : String(error));
      return publicError(req, "ANALYSIS_FAILED", "Browser analysis could not be completed. Please retry shortly.", 503);
    }
  }

  if (p === "/api/privacy/score" && method === "GET") {
    const limited = await rateLimit(req, "privacy-score", SCORE_API_LIMIT.windowMs, SCORE_API_LIMIT.max);
    if (limited) return limited;
    try {
      const result = await privacyService.evaluateRequest(req as any, null);
      return jsonResponse({ success: true, data: result, meta: apiMeta(req) });
    } catch (error) {
      console.error("[PRIVACY_SCORE] failed:", error instanceof Error ? error.message : String(error));
      return publicError(req, "ANALYSIS_FAILED", "Privacy analysis could not be completed. Please retry shortly.", 503);
    }
  }

  if (p === "/api/insights/population" && method === "GET") {
    const limited = await rateLimit(req, "population-insights", PUBLIC_API_LIMIT.windowMs, PUBLIC_API_LIMIT.max);
    if (limited) return limited;
    const score = Number(req.query.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) return publicError(req, "INVALID_SCORE", "Privacy score must be a number between 0 and 100.", 400);
    try {
      return jsonResponse({ success: true, data: await dbRepository.getPopulationInsightAsync(score, 30), meta: apiMeta(req) });
    } catch (error) {
      console.error("[POPULATION_INSIGHTS] failed:", error instanceof Error ? error.message : String(error));
      return publicError(req, "INSIGHTS_UNAVAILABLE", "Population insights are temporarily unavailable.", 503);
    }
  }


  if (p.startsWith("/api/admin")) {
    const prod = getRequestEnv("NODE_ENV") === "production";
    const secure = prod;

    if (p === "/api/admin/csrf" && method === "GET") {
      const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
      return jsonResponse({ success: true, data: { csrfToken: token }, meta: apiMeta(req) }, 200, { "Set-Cookie": cookieHeader("privasec_admin_csrf", token, { secure, sameSite: "Strict", path: "/api/admin", maxAge: 7200 }) });
    }

    if ((p === "/api/admin/login" || p === "/api/admin/auth/login") && method === "POST") {
      const credentials = (body || {}) as any;
      const result = await adminAuthService.login({ username: credentials.username, password: credentials.password, secretKey: credentials.secretKey }, req as any);
      if (!result.success) return jsonResponse({ success: false, error: { code: result.code || "AUTHENTICATION_FAILED", message: result.error || "Authentication failed", retryAfterSeconds: result.retryAfterSeconds } }, result.code === "RATE_LIMIT_EXCEEDED" ? 429 : 401);
      const headers: Record<string, string> = {};
      if (result.token) headers["Set-Cookie"] = cookieHeader("privasec_admin_session", result.token, { httpOnly: true, secure, sameSite: "Strict", path: "/", maxAge: 86400 });
      return jsonResponse({ success: true, data: { username: result.username, expiresAt: result.expiresAt }, meta: apiMeta(req) }, 200, headers);
    }

    if ((p === "/api/admin/logout" || p === "/api/admin/auth/logout") && method === "POST") {
      if (!(await hasValidCsrfToken(request))) return publicError(req, "CSRF_TOKEN_REQUIRED", "A valid CSRF token is required for this administrative action.", 403);
      const token = cookieValue(request, "privasec_admin_session") || (req.headers["authorization"] as string || "").replace(/^Bearer\s+/i, "") || (req.headers["x-admin-token"] as string | undefined);
      if (token) await adminAuthService.logoutAsync(token, req as any);
      return jsonResponse({ success: true, data: { message: "Logged out successfully" } }, 200, { "Set-Cookie": cookieHeader("privasec_admin_session", "", { httpOnly: true, secure, sameSite: "Strict", path: "/", maxAge: 0 }) });
    }

    const guarded = async (permission?: AdminPermission) => requireAdmin(req, permission);

    if ((p === "/api/admin/session" || p === "/api/admin/auth/session") && method === "GET") {
      const auth = await guarded();
      if (auth.response) return auth.response;
      return jsonResponse({ success: true, data: { authenticated: true, username: auth.session!.username, expiresAt: auth.session!.expiresAt, createdAt: auth.session!.createdAt, role: auth.session!.role } });
    }

    if ((p === "/api/admin/stats" || p === "/api/admin/metrics/overview") && method === "GET") {
      const auth = await guarded("stats:read");
      if (auth.response) return auth.response;
      return jsonResponse({ success: true, data: await dbRepository.getSystemAnalyticsSummaryAsync(), meta: apiMeta(req) });
    }

    if (p === "/api/admin/scans" && method === "GET") {
      const auth = await guarded("scans:read");
      if (auth.response) return auth.response;
      return jsonResponse({ success: true, ...(await dbRepository.getScanSessionsPaginatedAsync({ page: boundedPositiveInt(req.query.page, 1, MAX_ADMIN_PAGE), limit: boundedPositiveInt(req.query.limit, 10, MAX_ADMIN_LIMIT), country: req.query.country, tier: req.query.tier, search: boundedSearch(req.query.search), isVpn: req.query.isVpn === undefined ? undefined : req.query.isVpn === "true", sortBy: ((["countryCode", "privacyScore", "createdAt"] as const).includes(req.query.sortBy as any) ? req.query.sortBy : "createdAt") as "countryCode" | "privacyScore" | "createdAt", sortOrder: ((["asc", "desc"] as const).includes(req.query.sortOrder as any) ? req.query.sortOrder : "desc") as "asc" | "desc" })), meta: apiMeta(req) });
    }

    if (p === "/api/admin/logs" && method === "GET") {
      const auth = await guarded("logs:read");
      if (auth.response) return auth.response;
      return jsonResponse({ success: true, ...(await dbRepository.getSecurityLogsPaginatedAsync({ page: boundedPositiveInt(req.query.page, 1, MAX_ADMIN_PAGE), limit: boundedPositiveInt(req.query.limit, 10, MAX_ADMIN_LIMIT), eventType: req.query.eventType, search: boundedSearch(req.query.search) })), meta: apiMeta(req) });
    }

    if ((p === "/api/admin/metrics/pageviews" || p === "/api/admin/traffic") && method === "GET") {
      const auth = await guarded("metrics:read");
      if (auth.response) return auth.response;
      return jsonResponse({ success: true, data: await dbRepository.getPageViewMetricsAsync(), meta: apiMeta(req) });
    }

    if ((p === "/api/admin/metrics/events" || p === "/api/admin/events") && method === "GET") {
      const auth = await guarded("stats:read");
      if (auth.response) return auth.response;
      const stats = await dbRepository.getSystemAnalyticsSummaryAsync();
      return jsonResponse({ success: true, data: { totalAudits: stats.totalScans, vpnDetections: stats.vpnDetections ?? 0, webRtcLeaks: stats.webRtcConfirmedLeaks ?? 0, scoreTiers: (stats as any).tierCounts || {}, topCountries: stats.topCountries }, meta: apiMeta(req) });
    }

    if ((p === "/api/admin/metrics/performance" || p === "/api/admin/performance") && method === "GET") {
      const auth = await guarded("metrics:read");
      if (auth.response) return auth.response;
      return jsonResponse({ success: true, data: await dbRepository.getPerformanceMetricsSummaryAsync(), meta: apiMeta(req) });
    }

    if (p === "/api/admin/audit" && method === "GET") {
      const auth = await guarded("audit:read");
      if (auth.response) return auth.response;
      return jsonResponse({ success: true, ...(await dbRepository.getAdminAuditLogsPaginatedAsync({ page: boundedPositiveInt(req.query.page, 1, MAX_ADMIN_PAGE), limit: boundedPositiveInt(req.query.limit, 10, MAX_ADMIN_LIMIT), search: boundedSearch(req.query.search) })), meta: apiMeta(req) });
    }
  }

  return publicError(req, "NOT_FOUND", "API endpoint not found.", 404);
}

const SEO_PAGES: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'PrivaSec — Free Privacy & Browser Intelligence Auditor',
    description: 'Free, evidence-first privacy auditing for IP, networks, browser signals, fingerprint exposure, HTTP headers, and security exposure.',
  },
  '/browser': {
    title: 'Browser Privacy & Fingerprint Test | PrivaSec',
    description: 'Measure browser privacy signals, fingerprint exposure, WebRTC, graphics, hardware, storage, locale, and automation indicators.',
  },
  '/headers': {
    title: 'HTTP Security & Privacy Headers Test | PrivaSec',
    description: 'Inspect HTTP privacy and security headers, client hints, browser policy signals, and configuration evidence.',
  },
  '/learn': {
    title: 'Privacy & Security Learning Center | PrivaSec',
    description: 'Practical guides to IP privacy, browser fingerprinting, WebRTC, security headers, and IP reputation.',
  },
  '/privacy': {
    title: 'Privacy Policy | PrivaSec',
    description: 'Learn what PrivaSec measures, processes, stores, and deliberately does not collect.',
  },
};

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

async function crawlerHtmlResponse(request: Request, env: RuntimeEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const meta = SEO_PAGES[url.pathname];
  const shouldNoIndex = NON_INDEXABLE_PATHS.includes(url.pathname) || !meta;
  if (!env.ASSETS || (request.method !== 'GET' && request.method !== 'HEAD')) return null;
  if (!meta && !shouldNoIndex) return null;

  const upstream = await env.ASSETS.fetch(new Request(`${url.origin}/`, request));
  if (!upstream.ok) return null;
  const contentType = upstream.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return null;

  let html = await upstream.text();
  const canonical = `${url.origin}${url.pathname === '/' ? '/' : url.pathname}`;
  const effectiveTitle = meta?.title || 'PrivaSec | Privacy Intelligence';
  const effectiveDescription = meta?.description || 'PrivaSec privacy intelligence and browser exposure auditing.';
  const title = escapeHtml(effectiveTitle);
  const description = escapeHtml(effectiveDescription);
  const replacement =
    `<title>${title}</title>` +
    `<meta name="description" content="${description}">` +
    `<meta name="robots" content="${shouldNoIndex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'}">` +
    `<link rel="canonical" href="${canonical}">` +
    `<meta property="og:type" content="website">` +
    `<meta property="og:title" content="${title}">` +
    `<meta property="og:description" content="${description}">` +
    `<meta property="og:url" content="${canonical}">` +
    `<meta property="og:site_name" content="PrivaSec">` +
    `<meta name="twitter:card" content="summary">` +
    `<meta name="twitter:title" content="${title}">` +
    `<meta name="twitter:description" content="${description}">`;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, '').replace(/<meta[^>]+name=["']description["'][^>]*>\s*/i, '').replace(/<meta[^>]+name=["']robots["'][^>]*>\s*/i, '').replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/i, '').replace(/<meta[^>]+property=["']og:(title|description|type|url|site_name)["'][^>]*>\s*/gi, '').replace(/<meta[^>]+name=["']twitter:(card|title|description)["'][^>]*>\s*/gi, '');
  html = html.replace('</head>', `${replacement}</head>`);

  const headers = new Headers(upstream.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('content-language', 'en');
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  headers.set('vary', 'Accept-Encoding');
  return new Response(request.method === 'HEAD' ? null : html, { status: upstream.status, headers });
}

function seoResponse(request: Request): Response | null {
  const url = new URL(request.url);
  if (url.pathname === "/robots.txt") {
    return new Response(["User-agent: *", "Allow: /", "Disallow: /api/", "Disallow: /admin", "Disallow: /design-system", `Sitemap: ${url.origin}/sitemap.xml`, ""].join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
  }
  if (url.pathname === "/sitemap.xml") {
    const rows = INDEXABLE_PATHS.map((path) => `<url><loc>${url.origin}${path}</loc></url>`).join("");
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows}</urlset>`, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
  }
  return null;
}

async function handleRequest(request: Request, env: RuntimeEnv, ctx: ExecutionContext): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  if (/^\/api\/flag\/[A-Za-z]{2}$/.test(pathname)) {
    return applySecurityHeaders(await handleCountryFlag(request));
  }

  const seo = seoResponse(request);
  if (seo) return applySecurityHeaders(seo);

  const crawlerHtml = await crawlerHtmlResponse(request, env);
  if (crawlerHtml) return applySecurityHeaders(crawlerHtml);

  if (new URL(request.url).pathname.startsWith("/api/")) {
    const response = await handleApi(request, env, ctx);
    const finalResponse = applyCors(request, applySecurityHeaders(response), env);
    return finalResponse;
  }

  if (env.ASSETS) {
    return applySecurityHeaders(applyStaticCacheHeaders(request, await env.ASSETS.fetch(request)));
  }

  return new Response("Not found", { status: 404 });
}

/**
 * Root cause of the reported Cloudflare "Error 1101: Worker threw an exception":
 * `handleRequest` had no top-level error boundary, and several handlers inside `handleApi`
 * (population insights, every /api/admin/* analytics endpoint) call into `dbRepository`
 * without a try/catch. Any exception thrown from those calls - including a database query
 * against a column that migrations never created - propagated out of the fetch handler
 * entirely, which is what Cloudflare surfaces to the client as Error 1101 instead of a normal
 * HTTP error response.
 *
 * This wrapper also owns the full per-request database connection lifecycle:
 *
 *   BEFORE (removed): one `pg.Pool` created on cold start, cached in module-level variables
 *   (`dbInitialized`/`dbInitPromise`/`cachedPool`) and reused for every request handled by a
 *   warm isolate - the exact pattern Cloudflare's Hyperdrive docs warn against, and the
 *   confirmed cause of the intermittent "Cannot perform I/O on behalf of a different request"
 *   failures behind RATE_LIMITER_UNAVAILABLE and Error 1101.
 *
 *   AFTER: `createRequestDatabase` opens exactly one `pg.Client` for this call, scoped to this
 *   request only via `dbRepository.runWithRequestScopedRepository` (AsyncLocalStorage - see
 *   server/db/repository.ts), used for the request's complete lifecycle including any
 *   transactions, and closed in `finally` below no matter how the request ends. No database
 *   client or pool is ever stored in module/global scope, so there is nothing to share - or
 *   race - between concurrent requests.
 */
async function handleRequestSafely(request: Request, env: RuntimeEnv, ctx: ExecutionContext): Promise<Response> {
  const requestStartedAt = performance.now();
  const requestEnvValues = buildRequestEnvValues(env);
  return runWithRequestEnv(requestEnvValues, async () => {
    const pathname = new URL(request.url).pathname;
    const needsDatabase =
      pathname === "/api/health/ready" ||
      pathname === "/api/healthz" ||
      pathname === "/api/analyze/browser" ||
      pathname === "/api/privacy/score" ||
      pathname === "/api/insights/population" ||
      pathname === "/api/ip/reputation" ||
      pathname === "/api/ip" ||
      pathname === "/api/ip/network-intelligence" ||
      pathname === "/api/ip/details" ||
      pathname === "/api/headers" ||
      pathname === "/api/check/headers" ||
      pathname === "/api/headers/raw" ||
      pathname.startsWith("/api/admin");
    const { client, repo } = needsDatabase
      ? await createRequestDatabase(env)
      : { client: null, repo: null };

    try {
      const response = await dbRepository.runWithRequestScopedRepository(repo, () => handleRequest(request, env, ctx));
      const durationMs = Math.max(0, Number((performance.now() - requestStartedAt).toFixed(1)));
      const requestPath = new URL(request.url).pathname;
      if (requestPath.startsWith("/api/") || response.status >= 400) {
        console.log({
          event: "request.performance",
          method: request.method,
          path: requestPath,
          status: response.status,
          durationMs,
        });
      }
      return applyPerformanceHeaders(response, requestStartedAt);
    } catch (error) {
      console.error("[WORKER] Uncaught exception while handling request:", error instanceof Error ? (error.stack || error.message) : String(error));
      const requestId = `req_${crypto.randomUUID().replaceAll("-", "")}`;
      const response = applySecurityHeaders(
        jsonResponse(
          {
            success: false,
            error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred. Please retry shortly." },
            meta: { timestamp: new Date().toISOString(), requestId, version: "1.0.0" },
          },
          500,
        ),
      );
      console.log({
        event: "request.error",
        method: request.method,
        path: new URL(request.url).pathname,
        status: 500,
        durationMs: Math.max(0, Number((performance.now() - requestStartedAt).toFixed(1))),
      });
      return applyPerformanceHeaders(response, requestStartedAt);
    } finally {
      if (client) {
        await client.end().catch((closeError) => {
          console.error("[DATABASE] Error closing per-request connection:", closeError instanceof Error ? closeError.message : String(closeError));
        });
      }
    }
  });
}

export default { fetch: handleRequestSafely };
