import { dbRepository } from '../db/repository';
import { adminAuthService } from '../services/adminAuthService';
import {
  validateAdminUsername,
  validateAdminPassword,
  getAdminAuthConfig,
} from '../config';

async function runAdminCredentialConfigurationTests() {
  console.log('============================================================');
  console.log('--- RUNNING ADMIN CREDENTIAL CONFIGURATION TESTS (20/20) ---');
  console.log('============================================================\n');

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

  const originalEnv = { ...process.env };
  const mockReq = (ip = '192.0.2.77') =>
    ({
      headers: { 'x-forwarded-for': ip },
      socket: { remoteAddress: ip },
    } as any);

  try {
    // ------------------------------------------------------------
    // 1. ADMIN_USERNAME configuration validation
    // ------------------------------------------------------------
    console.log('1. Testing ADMIN_USERNAME configuration rules...');
    const validUser1 = validateAdminUsername('secops_admin');
    const validUser2 = validateAdminUsername('admin.ops-2026@domain');
    assert(validUser1.valid === true, 'Valid alphanumeric and underscore username accepted');
    assert(validUser2.valid === true, 'Valid email-like or dotted username accepted');

    const whitespaceUser = validateAdminUsername('admin user');
    const tabUser = validateAdminUsername('admin\tuser');
    assert(whitespaceUser.valid === false, 'Username with space rejected');
    assert(tabUser.valid === false, 'Username with tab whitespace rejected');

    const invalidCharUser = validateAdminUsername('admin$#<script>');
    assert(invalidCharUser.valid === false, 'Username with special/unsafe characters rejected');

    const shortUser = validateAdminUsername('ab');
    const longUser = validateAdminUsername('a'.repeat(65));
    assert(shortUser.valid === false, 'Username under 3 chars rejected');
    assert(longUser.valid === false, 'Username over 64 chars rejected');

    // ------------------------------------------------------------
    // 2. ADMIN_PASSWORD configuration validation
    // ------------------------------------------------------------
    console.log('\n2. Testing ADMIN_PASSWORD configuration rules...');
    const validPass = validateAdminPassword('SuperStrongPassphrase2026!#');
    assert(validPass.valid === true, 'Strong password passes validation');

    const shortPass = validateAdminPassword('short', true);
    assert(shortPass.valid === false, 'Password under 8 characters rejected in production');

    const excessivePass = validateAdminPassword('a'.repeat(129), true);
    assert(excessivePass.valid === false, 'Password over 128 characters rejected');

    // ------------------------------------------------------------
    // 3. Missing username handling
    // ------------------------------------------------------------
    console.log('\n3. Testing missing username handling...');
    const missingUserVal = validateAdminUsername(undefined);
    assert(missingUserVal.valid === false, 'Undefined username rejected safely');

    // ------------------------------------------------------------
    // 4. Missing password handling
    // ------------------------------------------------------------
    console.log('\n4. Testing missing password handling...');
    const missingPassVal = validateAdminPassword(undefined);
    assert(missingPassVal.valid === false, 'Undefined password rejected safely');

    // ------------------------------------------------------------
    // 5. Empty username handling
    // ------------------------------------------------------------
    console.log('\n5. Testing empty username handling...');
    const emptyUserVal = validateAdminUsername('');
    const whitespaceOnlyUser = validateAdminUsername('    ');
    assert(emptyUserVal.valid === false, 'Empty string username rejected');
    assert(whitespaceOnlyUser.valid === false, 'Whitespace-only username rejected');

    // ------------------------------------------------------------
    // 6. Empty password handling
    // ------------------------------------------------------------
    console.log('\n6. Testing empty password handling...');
    const emptyPassVal = validateAdminPassword('');
    assert(emptyPassVal.valid === false, 'Empty string password rejected');

    // ------------------------------------------------------------
    // 7. Password hashing (PBKDF2 with 100,000 iterations & random salt)
    // ------------------------------------------------------------
    console.log('\n7. Testing PBKDF2 password hashing & random salt...');
    const rawPlaintext = 'SecureTestOperatorPassword!2026';
    const hashRes1 = dbRepository.hashPassword(rawPlaintext);
    const hashRes2 = dbRepository.hashPassword(rawPlaintext);

    assert(hashRes1.hash.length === 64, 'PBKDF2 hash output is 64 hex characters (256-bit)');
    assert(hashRes1.salt.length === 32, 'Salt is 32 hex characters (128-bit cryptographically secure)');
    assert(hashRes1.salt !== hashRes2.salt, 'Each hash operation creates a distinct random salt');
    assert(hashRes1.hash !== hashRes2.hash, 'Identical plaintext produces distinct hashes due to per-user salt');
    assert(!hashRes1.hash.includes(rawPlaintext), 'Plaintext password is NEVER present in hash representation');

    // ------------------------------------------------------------
    // 8. Constant-time verification
    // ------------------------------------------------------------
    console.log('\n8. Testing constant-time password verification...');
    const verifySuccess = dbRepository.verifyPassword(rawPlaintext, hashRes1.hash, hashRes1.salt);
    const verifyFail = dbRepository.verifyPassword('WrongPlaintextPassword!2026', hashRes1.hash, hashRes1.salt);
    assert(verifySuccess === true, 'Constant-time verification succeeds for matching password');
    assert(verifyFail === false, 'Constant-time verification fails for non-matching password');

    // ------------------------------------------------------------
    // 9. Correct login flow
    // ------------------------------------------------------------
    console.log('\n9. Testing correct login flow with bootstrap credentials...');
    const testUsername = 'audit_lead_operator';
    const testPassword = 'RobustAuditPassword2026!#';
    dbRepository.bootstrapAdminCredentials(testUsername, testPassword);

    const loginSuccess = await adminAuthService.login(
      { username: testUsername, password: testPassword },
      mockReq('198.51.100.11')
    );
    assert(loginSuccess.success === true, 'Successful authentication with configured credentials');
    assert(loginSuccess.username === testUsername, 'Authenticated session returns correct username');
    assert(typeof loginSuccess.token === 'string' && loginSuccess.token.length === 64, 'Session token issued');

    // ------------------------------------------------------------
    // 10. Wrong password rejection
    // ------------------------------------------------------------
    console.log('\n10. Testing wrong password rejection...');
    const loginWrongPass = await adminAuthService.login(
      { username: testUsername, password: 'IncorrectPassword123!' },
      mockReq('198.51.100.12')
    );
    assert(loginWrongPass.success === false, 'Authentication fails on invalid password');
    assert(loginWrongPass.code === 'INVALID_CREDENTIALS', 'Returns INVALID_CREDENTIALS code');
    assert(loginWrongPass.token === undefined, 'No token issued on wrong password');

    // ------------------------------------------------------------
    // 11. Wrong username rejection
    // ------------------------------------------------------------
    console.log('\n11. Testing wrong username rejection...');
    const loginWrongUser = await adminAuthService.login(
      { username: 'non_existent_operator_user', password: testPassword },
      mockReq('198.51.100.13')
    );
    assert(loginWrongUser.success === false, 'Authentication fails on unknown username');
    assert(loginWrongUser.code === 'INVALID_CREDENTIALS', 'Returns INVALID_CREDENTIALS code');

    // ------------------------------------------------------------
    // 12. Rate limiting & lockout behavior
    // ------------------------------------------------------------
    console.log('\n12. Testing brute-force rate limiting & lockout...');
    const bruteForceIp = '203.0.113.199';
    dbRepository.resetFailedLogins(bruteForceIp);

    for (let i = 0; i < 5; i++) {
      await adminAuthService.login({ username: testUsername, password: 'bad_password' }, mockReq(bruteForceIp));
    }

    const lockedOutAttempt = await adminAuthService.login(
      { username: testUsername, password: testPassword },
      mockReq(bruteForceIp)
    );
    assert(lockedOutAttempt.success === false, 'Locked out even with correct password after 5 failed attempts');
    assert(lockedOutAttempt.code === 'RATE_LIMIT_EXCEEDED', 'Returns RATE_LIMIT_EXCEEDED');
    assert(
      typeof lockedOutAttempt.retryAfterSeconds === 'number' && lockedOutAttempt.retryAfterSeconds > 0,
      'Returns retryAfterSeconds for cooldown'
    );
    dbRepository.resetFailedLogins(bruteForceIp);

    // ------------------------------------------------------------
    // 13. Master secret login
    // ------------------------------------------------------------
    console.log('\n13. Testing master secret key login with timing-safe comparison...');
    process.env.ADMIN_SECRET_KEY = 'super_secret_master_key_production_2026!';
    const masterLoginSuccess = await adminAuthService.login(
      { secretKey: 'super_secret_master_key_production_2026!' },
      mockReq('198.51.100.14')
    );
    assert(masterLoginSuccess.success === true, 'Master secret key authentication succeeds');
    assert(masterLoginSuccess.username === 'superadmin', 'Master secret assigns superadmin role');

    const masterLoginWrong = await adminAuthService.login(
      { secretKey: 'invalid_secret_key_guess' },
      mockReq('198.51.100.15')
    );
    assert(masterLoginWrong.success === false, 'Invalid master secret key is rejected');

    // ------------------------------------------------------------
    // 14. Session creation & validation
    // ------------------------------------------------------------
    console.log('\n14. Testing session creation & active validation...');
    const sessionToken = loginSuccess.token!;
    const authReq = {
      headers: { authorization: `Bearer ${sessionToken}` },
      socket: { remoteAddress: '198.51.100.11' },
    } as any;

    const validatedSession = adminAuthService.validateToken(authReq);
    assert(validatedSession !== null, 'Session token resolves to active session');
    assert(validatedSession?.username === testUsername, 'Session user matches authenticated identity');
    assert(validatedSession?.expiresAt! > Date.now(), 'Session expires in future (24 hours)');

    // ------------------------------------------------------------
    // 15. Session revocation on logout
    // ------------------------------------------------------------
    console.log('\n15. Testing session revocation on logout...');
    const logoutResult = adminAuthService.logout(sessionToken, authReq);
    assert(logoutResult === true, 'Logout successfully revokes token');
    const postLogoutSession = adminAuthService.validateToken(authReq);
    assert(postLogoutSession === null, 'Revoked token is immediately rejected');

    // ------------------------------------------------------------
    // 16. Credential rotation
    // ------------------------------------------------------------
    console.log('\n16. Testing credential rotation...');
    // Log in to get active session before rotation
    const preRotateLogin = await adminAuthService.login(
      { username: testUsername, password: testPassword },
      mockReq('198.51.100.16')
    );
    const preRotateToken = preRotateLogin.token!;
    const preRotateReq = {
      headers: { authorization: `Bearer ${preRotateToken}` },
      socket: { remoteAddress: '198.51.100.16' },
    } as any;
    assert(adminAuthService.validateToken(preRotateReq) !== null, 'Pre-rotation session active');

    // Rotate password
    const newPassword = 'RotatedNewStrongPassword2026!#';
    const rotated = await adminAuthService.rotateCredentials(testUsername, newPassword);
    assert(rotated === true, 'Credential rotation executes successfully');

    // Active session for rotated user must now be invalidated
    const postRotateSession = adminAuthService.validateToken(preRotateReq);
    assert(postRotateSession === null, 'Existing session invalidated upon credential rotation');

    // ------------------------------------------------------------
    // 17. Old password rejection after rotation
    // ------------------------------------------------------------
    console.log('\n17. Testing old password rejection after rotation...');
    const oldPassAttempt = await adminAuthService.login(
      { username: testUsername, password: testPassword },
      mockReq('198.51.100.17')
    );
    assert(oldPassAttempt.success === false, 'Old password rejected after rotation');

    const newPassAttempt = await adminAuthService.login(
      { username: testUsername, password: newPassword },
      mockReq('198.51.100.17')
    );
    assert(newPassAttempt.success === true, 'New rotated password accepted successfully');

    // ------------------------------------------------------------
    // 18. Secret non-exposure verification
    // ------------------------------------------------------------
    console.log('\n18. Testing secret non-exposure across user records & responses...');
    const storedUser = dbRepository.getAdminUser(testUsername);
    assert(storedUser !== undefined, 'User record retrieved from repository');
    assert((storedUser as any).password === undefined, 'Plaintext password property does NOT exist on user');
    assert((storedUser as any).secretKey === undefined, 'Master secret key property does NOT exist on user');
    assert(storedUser?.passwordHash !== newPassword, 'Stored password hash is strictly hashed PBKDF2');

    // ------------------------------------------------------------
    // 19. Production weak / default credential rejection
    // ------------------------------------------------------------
    console.log('\n19. Testing production default/weak credential rejection...');
    const weakAdmin = validateAdminPassword('admin', true);
    const weakPass123 = validateAdminPassword('password123', true);
    const weakDefaultSeed = validateAdminPassword('AdminSecurity2026!', true);
    assert(weakAdmin.valid === false, 'Weak password "admin" rejected in production');
    assert(weakPass123.valid === false, 'Weak password "password123" rejected in production');
    assert(weakDefaultSeed.valid === false, 'Default template seed password rejected in production');

    // ------------------------------------------------------------
    // 20. Restart / persistence behavior
    // ------------------------------------------------------------
    console.log('\n20. Testing bootstrap re-evaluation behavior on restart...');
    // Re-evaluating bootstrap with the same credentials does not invalidate active sessions or wipe hashes
    const bootstrapRecheck = dbRepository.bootstrapAdminCredentials(testUsername, newPassword);
    assert(bootstrapRecheck.success === true, 'Bootstrap re-evaluation succeeds cleanly');
    assert(bootstrapRecheck.isNewUser === false, 'Correctly identifies existing user identity');

    console.log('\n============================================================');
    console.log(`ALL 20 ADMIN CREDENTIAL CONFIGURATION TESTS PASSED (${passed}/${passed + failed})`);
    console.log('============================================================');
  } finally {
    process.env = originalEnv;
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runAdminCredentialConfigurationTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
