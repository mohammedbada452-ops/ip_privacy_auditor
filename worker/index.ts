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
import { auditWebsite } from "../server/services/siteAudit";
import { CloudflareRequestCfProvider } from "../server/providers/geoip/CloudflareRequestCfProvider";

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

let dbInitialized = false;
let dbInitPromise: Promise<void> | null = null;

const INDEXABLE_PATHS = [
  "/",
  "/browser",
  "/headers",
  "/site-audit",
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

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error("PAYLOAD_TOO_LARGE");
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

function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Download-Options", "noopen");
  headers.set("X-DNS-Prefetch-Control", "off");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"
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

function publicError(req: ServiceRequest, code: string, message: string, status: number) {
  return jsonResponse({ success: false, error: { code, message }, meta: apiMeta(req) }, status);
}

async function ensureDatabase(env: RuntimeEnv): Promise<void> {
  process.env.NODE_ENV = env.NODE_ENV || process.env.NODE_ENV || "production";
  process.env.PRIVASEC_CLOUDFLARE_EDGE = "true";
  process.env.DATABASE_URL = typeof env.DATABASE_URL === "string" ? env.DATABASE_URL : process.env.DATABASE_URL;
  if (typeof env.SERVER_SECRET_SALT === "string") process.env.SERVER_SECRET_SALT = env.SERVER_SECRET_SALT;
  if (typeof env.ADMIN_USERNAME === "string") process.env.ADMIN_USERNAME = env.ADMIN_USERNAME;
  if (typeof env.ADMIN_PASSWORD === "string") process.env.ADMIN_PASSWORD = env.ADMIN_PASSWORD;
  if (typeof env.ADMIN_SECRET_KEY === "string") process.env.ADMIN_SECRET_KEY = env.ADMIN_SECRET_KEY;
  if (typeof env.IPINFO_TOKEN === "string") process.env.IPINFO_TOKEN = env.IPINFO_TOKEN;
  if (typeof env.ABUSEIPDB_API_KEY === "string") process.env.ABUSEIPDB_API_KEY = env.ABUSEIPDB_API_KEY;
  if (typeof env.CORS_ALLOWED_ORIGINS === "string") process.env.CORS_ALLOWED_ORIGINS = env.CORS_ALLOWED_ORIGINS;

  if (dbInitialized) return;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      const hyperdrive = env.HYPERDRIVE;
      const connectionString = hyperdrive?.connectionString?.trim() || (typeof env.DATABASE_URL === "string" ? env.DATABASE_URL.trim() : "");
      if (!connectionString) {
        dbRepository.setPostgresRepository(null);
        dbInitialized = true;
        return;
      }

      process.env.DATABASE_URL = connectionString;
      const [{ PostgresRepository }, { runMigrations }] = await Promise.all([
        import("../server/db/postgresRepository"),
        import("../server/db/migrationRunner"),
      ]);
      const pg = await import("pg");
      const pool = new pg.default.Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
      });
      const health = await pool.query("SELECT 1 AS healthy");
      if (health.rows?.[0]?.healthy !== 1) throw new Error("PostgreSQL health check failed");
      await runMigrations(pool);
      dbRepository.setPostgresRepository(new PostgresRepository(pool));
      dbInitialized = true;
      console.log("[DATABASE] PostgreSQL/Hyperdrive initialized.");
    } catch (error) {
      dbRepository.setPostgresRepository(null);
      dbInitialized = true;
      console.error("[DATABASE] Initialization failed; public APIs continue without persistence:", error instanceof Error ? error.message : String(error));
    }
  })();

  try {
    await dbInitPromise;
  } finally {
    dbInitPromise = null;
  }
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
  } catch {
    return process.env.NODE_ENV === "production"
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
    const healthy = process.env.NODE_ENV !== "production" ? true : Boolean(postgres && await postgres.checkHealth());
    return jsonResponse({
      success: healthy,
      data: { status: healthy ? "ok" : "unhealthy", uptime: 0, timestamp: new Date().toISOString(), service: "privacy-intelligence-auditor-api", environment: process.env.NODE_ENV || "production" },
      meta: apiMeta(req),
    }, healthy ? 200 : 503);
  }

  if (p === "/api/ip" && method === "GET") {
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
    const queryIp = req.query.ip?.trim();
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
    const targetIp = req.query.ip?.trim() || extractClientIp(req as any).ip;
    const validation = validateIp(targetIp);
    if (!validation.isValid) return publicError(req, "INVALID_IP", "Provided IP address is not valid.", 400);
    const limited = await rateLimit(req, "reputation", 60_000, 60);
    if (limited) return limited;
    return jsonResponse({ success: true, data: await ipReputationService.lookup(validation.normalizedIp), meta: apiMeta(req) });
  }

  if (p === "/api/ip/details" && method === "GET") {
    const targetIp = req.query.ip?.trim() || extractClientIp(req as any).ip;
    const validation = validateIp(targetIp);
    if (!validation.isValid) return publicError(req, "INVALID_IP", "Provided IP address is not valid.", 400);
    if (!validation.isPublic) return jsonResponse({ success: true, data: { ip: targetIp, measurementStatus: "NOT_MEASURED", geo: { country: "Not measured", countryCode: "XX", region: "Not measured", city: "Not measured", postalCode: "Not measured", latitude: null, longitude: null, timezone: "Unknown" }, network: { isp: "Not measured", organization: "Not measured", asn: "Not measured", isMobile: null, isProxy: null, isVpn: null, isTor: null, isHosting: null, provider: "NONE", providerStatus: "UNAVAILABLE" } }, meta: apiMeta(req) });
    const current = await new CloudflareRequestCfProvider(req.headers as any).lookup(validation.normalizedIp).catch(() => null);
    const details = current || await geoIPService.getDetails(validation.normalizedIp);
    return jsonResponse({ success: true, data: { ip: validation.normalizedIp, measurementStatus: details.network.providerStatus === "VERIFIED" ? "MEASURED" : "UNKNOWN", geo: details.geo, network: details.network }, meta: apiMeta(req) });
  }

  if ((p === "/api/headers" || p === "/api/check/headers") && method === "GET") {
    const extracted = extractClientIp(req as any);
    const entries = HeaderCollector.collect(req as any);
    const analysis = HeaderClassifier.analyze(entries, extracted.isInfrastructureProxy);
    return jsonResponse({ success: true, data: { ...analysis, scoreScope: "HEADERS_ONLY" }, meta: apiMeta(req) });
  }

  if (p === "/api/headers/raw" && method === "GET") {
    const extracted = extractClientIp(req as any);
    const entries = HeaderCollector.collect(req as any);
    const analysis = HeaderClassifier.analyze(entries, extracted.isInfrastructureProxy);
    return new Response(analysis.rawExport.rawHttp, { status: 200, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }

  if (p === "/api/analyze/browser" && method === "POST") {
    const limited = await rateLimit(req, "browser-analysis", 60_000, 30);
    if (limited) return limited;
    const fingerprint = (body as any)?.fingerprint ?? null;
    try {
      const result = await privacyService.evaluateRequest(req as any, fingerprint);
      ctx.waitUntil?.(Promise.resolve());
      return jsonResponse({ success: true, data: result, meta: apiMeta(req) });
    } catch (error) {
      return publicError(req, "ANALYSIS_FAILED", error instanceof Error ? error.message : "Browser analysis failed.", 400);
    }
  }

  if (p === "/api/privacy/score" && method === "GET") {
    try {
      const result = await privacyService.evaluateRequest(req as any, null);
      return jsonResponse({ success: true, data: result, meta: apiMeta(req) });
    } catch (error) {
      return publicError(req, "ANALYSIS_FAILED", error instanceof Error ? error.message : "Privacy analysis failed.", 400);
    }
  }

  if (p === "/api/insights/population" && method === "GET") {
    const score = Number(req.query.score);
    if (!Number.isFinite(score)) return publicError(req, "INVALID_SCORE", "A numeric privacy score is required.", 400);
    return jsonResponse({ success: true, data: await dbRepository.getPopulationInsightAsync(score, 30), meta: apiMeta(req) });
  }

  if (p === "/api/site-audit" && method === "GET") {
    const url = req.query.url || "";
    if (!url.trim()) return publicError(req, "URL_REQUIRED", "A website URL is required.", 400);
    try { return jsonResponse({ success: true, data: await auditWebsite(url), meta: apiMeta(req) }); }
    catch (error) { return publicError(req, "SITE_AUDIT_FAILED", error instanceof Error ? error.message : "Website audit failed.", 400); }
  }

  if (p.startsWith("/api/admin")) {
    const prod = process.env.NODE_ENV === "production";
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
      const token = cookieValue(request, "privasec_admin_session") || (req.headers["authorization"] as string || "").replace(/^Bearer\s+/i, "") || (req.headers["x-admin-token"] as string | undefined);
      if (token) await adminAuthService.logoutAsync(token, req as any);
      return jsonResponse({ success: true, data: { message: "Logged out successfully" } }, 200, { "Set-Cookie": "privasec_admin_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax" });
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
      return jsonResponse({ success: true, ...(await dbRepository.getScanSessionsPaginatedAsync({ page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10, country: req.query.country, tier: req.query.tier, search: req.query.search, isVpn: req.query.isVpn === undefined ? undefined : req.query.isVpn === "true", sortBy: ((["countryCode", "privacyScore", "createdAt"] as const).includes(req.query.sortBy as any) ? req.query.sortBy : "createdAt") as "countryCode" | "privacyScore" | "createdAt", sortOrder: ((["asc", "desc"] as const).includes(req.query.sortOrder as any) ? req.query.sortOrder : "desc") as "asc" | "desc" })), meta: apiMeta(req) });
    }

    if (p === "/api/admin/logs" && method === "GET") {
      const auth = await guarded("logs:read");
      if (auth.response) return auth.response;
      return jsonResponse({ success: true, ...(await dbRepository.getSecurityLogsPaginatedAsync({ page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10, eventType: req.query.eventType, search: req.query.search })), meta: apiMeta(req) });
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
      return jsonResponse({ success: true, ...(await dbRepository.getAdminAuditLogsPaginatedAsync({ page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10, search: req.query.search })), meta: apiMeta(req) });
    }
  }

  return null as unknown as Response;
}

function seoResponse(request: Request): Response | null {
  const url = new URL(request.url);
  if (url.pathname === "/robots.txt") {
    return new Response(["User-agent: *", "Allow: /", "Disallow: /api/", "Disallow: /admin", `Sitemap: ${url.origin}/sitemap.xml`, ""].join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
  }
  if (url.pathname === "/sitemap.xml") {
    const rows = INDEXABLE_PATHS.map((path) => `<url><loc>${url.origin}${path}</loc></url>`).join("");
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows}</urlset>`, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
  }
  return null;
}

async function handleRequest(request: Request, env: RuntimeEnv, ctx: ExecutionContext): Promise<Response> {
  const seo = seoResponse(request);
  if (seo) return applySecurityHeaders(seo);

  await ensureDatabase(env);

  if (new URL(request.url).pathname.startsWith("/api/")) {
    const response = await handleApi(request, env, ctx);
    const finalResponse = applyCors(request, applySecurityHeaders(response), env);
    return finalResponse;
  }

  if (env.ASSETS) {
    return applySecurityHeaders(await env.ASSETS.fetch(request));
  }

  return new Response("Not found", { status: 404 });
}

export default { fetch: handleRequest };
