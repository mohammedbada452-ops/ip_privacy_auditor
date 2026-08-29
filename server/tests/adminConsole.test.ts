import { dbRepository } from '../db/repository';
import { adminAuthService } from '../services/adminAuthService';
import { translations, validateAllLocales, SUPPORTED_LANGUAGES } from '../../src/i18n';

async function runStage12AdminTests() {
  console.log('==================================================');
  console.log('RUNNING STAGE 12 ADMIN CONSOLE & SECURITY TESTS');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Password Hashing & Verification (PBKDF2)
  console.log('--- 1. Cryptographic Security & Password Hashing ---');
  const password = 'AdminTestSecretPassword123!';
  const { hash, salt } = dbRepository.hashPassword(password);
  assert(hash.length === 64, 'Password hash is 64 hex characters (256-bit)');
  assert(salt.length === 32, 'Salt is 32 hex characters (128-bit random salt)');
  assert(dbRepository.verifyPassword(password, hash, salt), 'Correct password successfully verifies against PBKDF2 hash');
  assert(!dbRepository.verifyPassword('WrongPassword123', hash, salt), 'Incorrect password is rejected');

  // 2. IP Anonymization (HMAC-SHA256)
  console.log('\n--- 2. IP Anonymization & Privacy Preservation ---');
  const rawIp1 = '198.51.100.42';
  const rawIp2 = '198.51.100.43';
  const hashedIp1 = dbRepository.anonymizeIp(rawIp1);
  const hashedIp2 = dbRepository.anonymizeIp(rawIp2);
  assert(hashedIp1.length === 64, 'Anonymized IP is a 64-char HMAC-SHA256 hash');
  assert(hashedIp1 !== rawIp1, 'Raw IP is never stored as plaintext');
  assert(hashedIp1 !== hashedIp2, 'Distinct IPs yield distinct hashes');
  assert(dbRepository.anonymizeIp(rawIp1) === hashedIp1, 'Deterministic hashing for accurate unique visitor counting');

  // 3. Brute-Force Rate Limiting
  console.log('\n--- 3. Brute-Force Rate Limiting ---');
  const testClientIp = '203.0.113.99';
  dbRepository.resetFailedLogins(testClientIp);
  
  let rateLimit = dbRepository.checkLoginRateLimit(testClientIp);
  assert(!rateLimit.isBlocked, 'Initial attempt is not blocked');

  for (let i = 1; i <= 5; i++) {
    dbRepository.recordFailedLogin(testClientIp);
  }

  rateLimit = dbRepository.checkLoginRateLimit(testClientIp);
  assert(rateLimit.isBlocked, 'IP is blocked after 5 consecutive failed attempts');
  assert((rateLimit.retryAfterSeconds ?? 0) > 0, 'Retry-After seconds is returned on rate limited state');

  dbRepository.resetFailedLogins(testClientIp);
  rateLimit = dbRepository.checkLoginRateLimit(testClientIp);
  assert(!rateLimit.isBlocked, 'Resetting failed login attempts clears the block');

  // 4. Admin Authentication Service
  console.log('\n--- 4. Admin Authentication & Session Management ---');
  dbRepository.bootstrapAdminCredentials('admin', 'AdminConsoleTestPass2026!#');

  const mockReq = {
    headers: { 'x-forwarded-for': '192.0.2.100' },
    socket: { remoteAddress: '192.0.2.100' },
  } as any;

  // Invalid login
  const failedLogin = await adminAuthService.login({ username: 'admin', password: 'incorrect_password' }, mockReq);
  assert(!failedLogin.success, 'Login fails with invalid password');
  assert(failedLogin.code === 'INVALID_CREDENTIALS', 'Returns INVALID_CREDENTIALS code');

  // Valid login
  const validLogin = await adminAuthService.login({ username: 'admin', password: 'AdminConsoleTestPass2026!#' }, mockReq);
  assert(validLogin.success === true, 'Admin successfully authenticates with valid credentials');
  assert(typeof validLogin.token === 'string' && validLogin.token.length > 20, 'Session token is returned');
  assert(validLogin.username === 'admin', 'Authenticated username is returned');

  // Validate Token
  const tokenReq = {
    headers: { authorization: `Bearer ${validLogin.token}` },
    socket: { remoteAddress: '192.0.2.100' },
  } as any;
  const session = adminAuthService.validateToken(tokenReq);
  assert(session !== null && session.username === 'admin', 'Token validation correctly resolves active session');

  // Logout
  const loggedOut = adminAuthService.logout(validLogin.token!, tokenReq);
  assert(loggedOut === true, 'Logout successfully invalidates session token');
  const expiredSession = adminAuthService.validateToken(tokenReq);
  assert(expiredSession === null, 'Invalidated session token fails subsequent authorization');

  // 5. Database Repository Metrics & Pagination
  console.log('\n--- 5. Repository Metrics & Aggregations ---');
  
  // Record some scan sessions
  dbRepository.recordScanSession({
    ipHash: dbRepository.anonymizeIp('198.51.100.1'),
    countryCode: 'US',
    city: 'San Jose',
    isp: 'Cloudflare',
    isVpn: true,
    isProxy: false,
    isTor: false,
    isWebRtcLeak: false,
    privacyScore: 78,
    scoreTier: 'GOOD',
    userAgentCategory: 'Chrome/Desktop',
  });

  dbRepository.recordScanSession({
    ipHash: dbRepository.anonymizeIp('198.51.100.2'),
    countryCode: 'DE',
    city: 'Frankfurt',
    isp: 'Hetzner',
    isVpn: false,
    isProxy: false,
    isTor: false,
    isWebRtcLeak: true,
    privacyScore: 42,
    scoreTier: 'MODERATE',
    userAgentCategory: 'Firefox/Desktop',
  });

  const summary = dbRepository.getSystemAnalyticsSummary();
  assert(summary.totalScans >= 2, 'Total scans count is accurately aggregated');
  assert(summary.uniqueIpsCount >= 2, 'Unique IPs count is accurately tracked');
  assert(summary.averagePrivacyScore > 0, 'Average privacy score is calculated');
  assert(summary.topCountries.length > 0, 'Top scanning regions aggregated');

  // Test Pagination & Filtering
  const paginatedScans = dbRepository.getScanSessionsPaginated({ page: 1, limit: 5 });
  assert(paginatedScans.data.length > 0, 'Paginated scan query returns data items');
  assert(paginatedScans.pagination.total >= 2, 'Pagination metadata accurately reports total records');

  const filteredByTier = dbRepository.getScanSessionsPaginated({ tier: 'GOOD' });
  assert(filteredByTier.data.every((s) => s.scoreTier === 'GOOD'), 'Filtering by score tier is strictly respected');

  // Security Logs & Audit Trail
  const secLogs = dbRepository.getSecurityLogsPaginated({ limit: 10 });
  assert(secLogs.data.length > 0, 'Security event logs are recorded and queryable');

  const auditLogs = dbRepository.getAdminAuditLogsPaginated({ limit: 10 });
  assert(auditLogs.data.length > 0, 'Admin audit actions are recorded and queryable');

  // 6. I18n & Translations Check
  console.log('\n--- 6. Internationalization Symmetry & Admin Strings ---');
  const validation = validateAllLocales();
  assert(validation.valid === true, `All 6 locales pass key symmetry including new admin keys (Errors: ${validation.errors.length})`);
  
  for (const lang of SUPPORTED_LANGUAGES) {
    const loc = translations[lang];
    assert(typeof loc.admin?.portalTitle === 'string' && loc.admin.portalTitle.length > 0, `[${lang}] admin.portalTitle present`);
    assert(typeof loc.admin?.loginButton === 'string' && loc.admin.loginButton.length > 0, `[${lang}] admin.loginButton present`);
    assert(typeof loc.admin?.tabs?.overview === 'string' && loc.admin.tabs.overview.length > 0, `[${lang}] admin.tabs.overview present`);
  }

  console.log('\n==================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage12AdminTests().catch((err) => {
  console.error('Stage 12 Admin Test Suite Failed:', err);
  process.exit(1);
});
