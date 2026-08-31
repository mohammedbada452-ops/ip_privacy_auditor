import fs from 'node:fs';
import path from 'node:path';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[FAIL] ${message}`);
  console.log(`[PASS] ${message}`);
}

const adminRoutes = fs.readFileSync(path.resolve(process.cwd(), 'server/routes/admin.ts'), 'utf8');
const adminAuth = fs.readFileSync(path.resolve(process.cwd(), 'server/services/adminAuthService.ts'), 'utf8');
const requestEnv = fs.readFileSync(path.resolve(process.cwd(), 'server/config/requestEnv.ts'), 'utf8');
const authDocs = fs.readFileSync(path.resolve(process.cwd(), 'docs/security/ADMIN_PRODUCTION_AUTH.md'), 'utf8');
const credentialDocs = fs.readFileSync(path.resolve(process.cwd(), 'docs/security/ADMIN_CREDENTIAL_MANAGEMENT.md'), 'utf8');
const recovery = fs.readFileSync(path.resolve(process.cwd(), 'scripts/reset-admin-credentials.mjs'), 'utf8');

assert(adminRoutes.includes("getRequestEnv('NODE_ENV') === 'production'"), 'Admin routes use request-scoped NODE_ENV in Worker runtime');
assert(!adminRoutes.includes("process.env.NODE_ENV === 'production'"), 'Admin routes do not rely on process.env NODE_ENV in Worker runtime');
assert(adminRoutes.includes("httpOnly: true") && adminRoutes.includes("sameSite: 'strict'"), 'Admin session cookie remains HttpOnly + SameSite=Strict');
assert(adminRoutes.includes("const isProduction = getRequestEnv('NODE_ENV') === 'production'"), 'Production cookie/security decisions are Worker-env aware');
assert(adminRoutes.includes("const isDevelopment = getRequestEnv('NODE_ENV') !== 'production'"), 'CSRF development exception is Worker-env aware');
assert(adminAuth.includes('getAdminAuthConfig()'), 'Admin auth remains environment-configured and server-side');
assert(requestEnv.includes('ADMIN_USERNAME') && requestEnv.includes('ADMIN_PASSWORD'), 'Admin secrets remain request-scoped and server-side');
assert(authDocs.includes('600,000') && authDocs.includes('SameSite=Strict'), 'Admin security documentation matches implemented PBKDF2/cookie policy');
assert(credentialDocs.includes('600,000') && credentialDocs.includes('SameSite=Strict'), 'Credential management documentation matches implementation');
assert(recovery.includes('pbkdf2Sync(password, salt, 600000'), 'Admin reset script uses the same PBKDF2 work factor as runtime');
assert(!recovery.includes('admin/admin'), 'Admin recovery contains no predictable default credentials');
console.log('STAGE 4 admin hardening regression checks passed.');
