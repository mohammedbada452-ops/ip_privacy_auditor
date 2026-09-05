/**
 * Server Configuration Manager
 * 
 * Separates REQUIRED FOUNDATION CONFIG (Stage 3 UI / Design System)
 * from FUTURE FEATURE CONFIG (Database, GeoIP, Admin Auth, Security Salt).
 * 
 * Stage 3 only validates foundation variables (PORT, NODE_ENV).
 * Future variables are lazily loaded only when accessed by future feature endpoints.
 */

export interface FoundationConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
}

import { getRequestEnv } from './config/requestEnv';

export interface AdminAuthConfig {
  adminUsername?: string;
  adminPassword?: string;
  adminSecretKey?: string;
  isProduction: boolean;
}

/**
 * Returns core server configuration. Feature-specific secrets are validated by their dedicated accessors.
 */
export function getFoundationConfig(): FoundationConfig {
  const port = parseInt(getRequestEnv('PORT') || '3000', 10);
  const nodeEnv = (getRequestEnv('NODE_ENV') || 'development') as FoundationConfig['nodeEnv'];

  return {
    port,
    nodeEnv,
  };
}

/**
 * Accessor for PostgreSQL configuration.
 */
export function getDatabaseConfig(): { databaseUrl: string } {
  const databaseUrl = getRequestEnv('DATABASE_URL');
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required for database operations in later stages, but is not configured.'
    );
  }
  return { databaseUrl };
}

/**
 * Accessor for GeoIP provider configuration.
 */
export function getGeoIPConfig(): { apiKey: string } {
  const apiKey = getRequestEnv('GEOIP_API_KEY');
  if (!apiKey) {
    throw new Error(
      'GEOIP_API_KEY is required for GeoIP provider operations in later stages, but is not configured.'
    );
  }
  return { apiKey };
}

/**
 * Validates admin username format and length constraints.
 * Rules:
 * - Must be a non-empty string.
 * - Must NOT contain whitespace characters.
 * - Length between 3 and 64 characters.
 * - Allowed characters: alphanumeric, '.', '_', '-', '@'
 */
export function validateAdminUsername(username?: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Admin username must be a non-empty string.' };
  }
  const trimmed = username.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Admin username cannot be empty or whitespace only.' };
  }
  if (/\s/.test(username)) {
    return { valid: false, error: 'Admin username cannot contain whitespace characters.' };
  }
  if (trimmed.length < 3) {
    return { valid: false, error: 'Admin username must be at least 3 characters in length.' };
  }
  if (trimmed.length > 64) {
    return { valid: false, error: 'Admin username cannot exceed 64 characters in length.' };
  }
  if (!/^[a-zA-Z0-9._\-@]+$/.test(trimmed)) {
    return { valid: false, error: 'Admin username contains invalid characters. Allowed: a-z, A-Z, 0-9, ., _, -, @' };
  }
  return { valid: true };
}

/**
 * Validates admin password constraints.
 * Rules:
 * - Must be a non-empty string.
 * - Length between 8 and 128 characters (min 6 in development).
 * - In production: rejects known weak default passwords.
 */
export function validateAdminPassword(
  password?: string,
  isProduction: boolean = false
): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Admin password must be a non-empty string.' };
  }
  if (password.length === 0) {
    return { valid: false, error: 'Admin password cannot be empty.' };
  }
  const minLength = isProduction ? 8 : 6;
  if (password.length < minLength) {
    return { valid: false, error: `Admin password must be at least ${minLength} characters in length.` };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Admin password cannot exceed 128 characters in length.' };
  }
  if (isProduction) {
    const lower = password.toLowerCase();
    const weakList = [
      'admin',
      'password',
      'password123',
      'admin123',
      '123456',
      '12345678',
      'admin2026',
      'adminsecurity2026!',
    ];
    if (weakList.includes(lower)) {
      return { valid: false, error: 'Admin password cannot be a common default or weak password in production.' };
    }
  }
  return { valid: true };
}

/**
 * Lazy accessor for Admin Auth Config.
 * Reads ADMIN_USERNAME, ADMIN_PASSWORD, and ADMIN_SECRET_KEY.
 * In production mode:
 * - Validates credentials and rejects weak defaults.
 * - Requires either (ADMIN_USERNAME & ADMIN_PASSWORD), or an ADMIN_SECRET_KEY bound to ADMIN_USERNAME.
 */
export function getAdminAuthConfig(): AdminAuthConfig {
  const adminUsername = getRequestEnv('ADMIN_USERNAME') ? getRequestEnv('ADMIN_USERNAME')!.trim() : undefined;
  const adminPassword = getRequestEnv('ADMIN_PASSWORD') || undefined;
  const adminSecretKey = getRequestEnv('ADMIN_SECRET_KEY') ? getRequestEnv('ADMIN_SECRET_KEY')!.trim() : undefined;
  const isProduction = getRequestEnv('NODE_ENV') === 'production';

  if (adminUsername) {
    const userVal = validateAdminUsername(adminUsername);
    if (!userVal.valid) {
      throw new Error(`Invalid ADMIN_USERNAME configuration: ${userVal.error}`);
    }
  }

  if (adminPassword) {
    const passVal = validateAdminPassword(adminPassword, isProduction);
    if (!passVal.valid) {
      throw new Error(`Invalid ADMIN_PASSWORD configuration: ${passVal.error}`);
    }
  }

  if (isProduction) {
    const hasUserPass = Boolean(adminUsername && adminPassword);
    const hasBoundSecret = Boolean(adminUsername && adminSecretKey && adminSecretKey.length >= 16);
    if (!hasUserPass && !hasBoundSecret) {
      throw new Error(
        'Production Admin Authentication requires ADMIN_USERNAME + ADMIN_PASSWORD, or ADMIN_USERNAME + a secure ADMIN_SECRET_KEY bound to an existing admin identity.'
      );
    }
  }

  return {
    adminUsername,
    adminPassword,
    adminSecretKey,
    isProduction,
  };
}

/**
 * Accessor for the server-side HMAC salt used to pseudonymize sensitive identifiers.
 */
export function getSecuritySaltConfig(): { serverSecretSalt?: string } {
  const serverSecretSalt = getRequestEnv('SERVER_SECRET_SALT');
  if (getRequestEnv('NODE_ENV') === 'production' && (!serverSecretSalt || serverSecretSalt.length < 32)) {
    throw new Error('SERVER_SECRET_SALT must be configured with at least 32 characters in production.');
  }
  return { serverSecretSalt };
}

/**
 * Accessor for Production Security Config (Stage 13).
 */
export function getProductionSecurityConfig(): {
  corsAllowedOrigins: string[];
  disableRateLimit: boolean;
  trustedProxyCidrs: string[];
} {
  const rawCorsAllowedOrigins = getRequestEnv('CORS_ALLOWED_ORIGINS');
  const corsAllowedOrigins = rawCorsAllowedOrigins
    ? rawCorsAllowedOrigins.split(',').map((s: string) => s.trim())
    : [];
  const disableRateLimit = getRequestEnv('DISABLE_RATE_LIMIT') === 'true';
  const trustedProxyCidrs = (getRequestEnv('TRUSTED_PROXY_CIDRS') || getRequestEnv('TRUSTED_PROXIES') || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  if (getRequestEnv('NODE_ENV') === 'production' && disableRateLimit) {
    throw new Error('DISABLE_RATE_LIMIT must never be enabled in production.');
  }

  return {
    corsAllowedOrigins,
    disableRateLimit,
    trustedProxyCidrs,
  };
}

