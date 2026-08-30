import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The subset of configuration that varies by deployment (secrets and deployment-level flags)
 * and is read from multiple service modules shared between the Cloudflare Worker and the
 * Node/Express dev server. Previously the Worker bridged these into global `process.env` on
 * every request; this module replaces that with a request-scoped context (the same
 * AsyncLocalStorage pattern already used for the PostgreSQL repository in
 * server/db/repository.ts) so nothing is written to a global that concurrent requests on the
 * same warm isolate could observe or interleave.
 */
export interface RequestEnvValues {
  NODE_ENV?: string;
  PRIVASEC_CLOUDFLARE_EDGE?: string;
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
}

const requestEnvStorage = new AsyncLocalStorage<RequestEnvValues>();

/**
 * Reads a single configuration value scoped to the current request. Inside a Cloudflare Worker
 * request (see `runWithRequestEnv`, called once per request in worker/index.ts), this returns
 * exactly what that request's `env` bindings provided - never a value left over from a
 * different request, and never written to any shared object. Outside any request-scoped
 * context (the Node/Express dev server, scripts, tests), it falls back to real `process.env`,
 * which is how that long-running process has always configured itself - unchanged.
 */
export function getRequestEnv(key: keyof RequestEnvValues): string | undefined {
  const scoped = requestEnvStorage.getStore();
  if (scoped && key in scoped) return scoped[key];
  return process.env[key];
}

/**
 * Scopes `values` to the current request only, for the duration of `fn`. Concurrent requests
 * handled by the same warm Worker isolate each get their own independent values - identical to
 * `dbRepository.runWithRequestScopedRepository`, and typically nested inside it (see
 * worker/index.ts).
 */
export function runWithRequestEnv<T>(values: RequestEnvValues, fn: () => Promise<T>): Promise<T> {
  return requestEnvStorage.run(values, fn);
}
