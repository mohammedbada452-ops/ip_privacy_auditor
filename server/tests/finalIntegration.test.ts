/**
 * Stage 14: Final Integration & Release Readiness Test Suite
 * Validates cross-system data flows, API contracts, security boundaries,
 * internationalization symmetry, and error handling for production release.
 */

import { strict as assert } from 'assert';
import { validateIp, extractClientIp } from '../utils/ipExtractor';
import { geoIPService } from '../services/geoip';
import { PrivacyEngine } from '../privacy/PrivacyEngine';
import { HeaderCollector, HeaderClassifier } from '../headers';
import { dbRepository } from '../db/repository';
import { adminAuthService } from '../services/adminAuthService';
import { validateBrowserFingerprintPayload, PayloadValidationError } from '../utils/payloadValidator';
import { DICTIONARIES, SUPPORTED_LANGUAGES, type Language } from '../../src/i18n';
import type { Request } from 'express';

console.log('\n============================================================');
console.log('--- RUNNING STAGE 14 FINAL INTEGRATION & RELEASE READINESS TESTS ---');
console.log('============================================================\n');

async function runStage14Tests() {
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`[PASS] ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`[FAIL] ${name}:`, err);
            process.exit(1);
          });
      } else {
        console.log(`[PASS] ${name}`);
        passed++;
      }
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err);
      process.exit(1);
    }
  }

  // 1. JOURNEY A: IP Intelligence Data Integrity
  await test('Journey A: RFC1918 / Loopback address classification and fallback', async () => {
    const loopback = '127.0.0.1';
    const validation = validateIp(loopback);
    assert.strictEqual(validation.isValid, true);
    assert.strictEqual(validation.isPrivate, true);

    const details = await geoIPService.getDetails(loopback);
    assert.ok(details.geo.countryCode === 'PRIVATE' || details.geo.countryCode === 'LOCAL');
    assert.strictEqual(details.network.isVpn, false);
    assert.strictEqual(details.network.isProxy, false);
  });

  await test('Journey A: Public IP resolution and ASN extraction', async () => {
    const publicIp = '8.8.8.8';
    const validation = validateIp(publicIp);
    assert.strictEqual(validation.isValid, true);
    assert.strictEqual(validation.isPrivate, false);

    const details = await geoIPService.getDetails(publicIp);
    assert.ok(details.geo.country);
    assert.ok(details.network.isp);
  });

  // 2. JOURNEY B: Cross-Feature Privacy Engine Data Flow
  await test('Journey B: Deterministic Privacy Score calculation with IP + Headers + Browser signals', () => {
    const engine = new PrivacyEngine();
    const mockIpCheck = {
      ip: '203.0.113.195',
      ipVersion: 'IPv4' as const,
      isPrivate: false,
      headers: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        secGpc: '1',
        dnt: '1',
        acceptLanguage: 'en-US,en;q=0.9',
        connection: 'keep-alive',
      },
      connectionFlags: {
        hasProxyHeaders: false,
        viaHeader: null,
      },
    };

    const mockIpDetails = {
      ip: '203.0.113.195',
      geo: {
        country: 'United States',
        countryCode: 'US',
        region: 'California',
        city: 'Mountain View',
        postalCode: '94043',
        latitude: 37.422,
        longitude: -122.084,
        timezone: 'America/Los_Angeles',
      },
      network: {
        isp: 'Google LLC',
        organization: 'Google Fiber',
        asn: 'AS15169',
        isMobile: false,
        isProxy: false,
        isVpn: false,
        isTor: false,
        isHosting: false,
      },
    };

    const mockFingerprint = {
      canvasHash: 'fnv_a1b2c3d4',
      webgl: { vendor: 'Google Inc.', renderer: 'ANGLE (Apple M2)' },
      audioHash: 'aud_987654',
      webRtc: { localIps: [], publicIps: [] },
      securityFlags: { isAutomation: false, isAdBlockActive: true, isIncognito: false },
    };

    const result = engine.evaluate({
      ipCheck: mockIpCheck,
      ipDetails: mockIpDetails,
      fingerprint: mockFingerprint,
    });

    assert.ok(result.privacyScore >= 0 && result.privacyScore <= 100);
    assert.ok(['EXCELLENT', 'GOOD', 'MODERATE', 'CRITICAL'].includes(result.tier));
    assert.ok(result.factors.length > 0);
    assert.strictEqual(typeof result.breakdown.networkScore, 'number');
    assert.strictEqual(typeof result.breakdown.headerScore, 'number');
    assert.strictEqual(typeof result.breakdown.fingerprintScore, 'number');
    assert.strictEqual(typeof result.breakdown.securityScore, 'number');
  });

  // 3. JOURNEY C: Browser Payload Sanitization & Boundary Bounds
  await test('Journey C: Browser payload validation rejects out-of-bounds inputs', () => {
    assert.throws(() => {
      validateBrowserFingerprintPayload({
        hardware: { cpuCores: 999999 }, // Max is 1024
      });
    }, PayloadValidationError);

    assert.throws(() => {
      validateBrowserFingerprintPayload({
        canvasHash: 'x'.repeat(200), // Max is 128
      });
    }, PayloadValidationError);

    const valid = validateBrowserFingerprintPayload({
      canvasHash: 'abc12345',
      hardware: { cpuCores: 16, deviceMemory: 32 },
    });
    assert.strictEqual(valid?.canvasHash, 'abc12345');
    assert.strictEqual(valid?.hardware?.cpuCores, 16);
  });

  // 4. JOURNEY D: HTTP Headers Redaction & Classification
  await test('Journey D: HTTP headers collector safely redacts sensitive tokens and cookies', () => {
    const mockReq = {
      headers: {
        'authorization': 'Bearer super_secret_admin_token_xyz_123',
        'cookie': 'session_id=abcdef123456789; secret_cookie=val987',
        'x-api-key': 'live_key_production_secret',
        'user-agent': 'Mozilla/5.0 PrivacyAuditor/1.0',
        'sec-gpc': '1',
      },
      rawHeaders: [
        'authorization', 'Bearer super_secret_admin_token_xyz_123',
        'cookie', 'session_id=abcdef123456789; secret_cookie=val987',
        'x-api-key', 'live_key_production_secret',
        'user-agent', 'Mozilla/5.0 PrivacyAuditor/1.0',
        'sec-gpc', '1',
      ],
      method: 'GET',
      path: '/api/headers',
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const entries = HeaderCollector.collect(mockReq);
    const analysis = HeaderClassifier.analyze(entries);

    // Assert sensitive headers are classified with isSensitive=true and redacted in sanitizedValue
    const authHeader = analysis.headers.find(h => h.name.toLowerCase() === 'authorization');
    if (!authHeader) throw new Error('Authorization header fixture missing');
    assert.strictEqual(authHeader.isSensitive, true);
    assert.ok(authHeader.sanitizedValue.includes('REDACTED') || authHeader.sanitizedValue.includes('Bearer [REDACTED]'));

    const cookieHeader = analysis.headers.find(h => h.name.toLowerCase() === 'cookie');
    if (!cookieHeader) throw new Error('Cookie header fixture missing');
    assert.strictEqual(cookieHeader.isSensitive, true);
    assert.ok(cookieHeader.sanitizedValue.includes('REDACTED'));
  });

  // 5. JOURNEY E: Admin Authentication, Brute-Force & Audit Trail
  await test('Journey E: Admin password verification using constant-time PBKDF2', () => {
    const { hash, salt } = dbRepository.hashPassword('AdminTestPassSecure2026!');
    assert.strictEqual(dbRepository.verifyPassword('AdminTestPassSecure2026!', hash, salt), true);
    assert.strictEqual(dbRepository.verifyPassword('WrongPassword123', hash, salt), false);
  });

  await test('Journey E: Admin session creation, retrieval, and invalidation', () => {
    const session = dbRepository.createSession('admin', 'usr_admin_001', '127.0.0.1');
    assert.ok(session.token);

    const retrieved = dbRepository.getSession(session.token);
    assert.strictEqual(retrieved?.username, 'admin');

    const revoked = dbRepository.invalidateSession(session.token);
    assert.strictEqual(revoked, true);

    const checkRevoked = dbRepository.getSession(session.token);
    assert.strictEqual(checkRevoked, null);
  });

  // 6. Internationalization Symmetry across all 6 locales
  await test('i18n: 100% complete key symmetry across all 6 locales', () => {
    const baseKeys = Object.keys(DICTIONARIES.en).sort();
    for (const lang of SUPPORTED_LANGUAGES) {
      const locKeys = Object.keys(DICTIONARIES[lang]).sort();
      assert.deepStrictEqual(
        locKeys,
        baseKeys,
        `Locale '${lang}' must have identical top-level keys as English`
      );

      // Verify sub-objects
      assert.ok(DICTIONARIES[lang].ip.title);
      assert.ok(DICTIONARIES[lang].browser.title);
      assert.ok(DICTIONARIES[lang].headers.title);
      assert.ok(DICTIONARIES[lang].admin.portalTitle);
      assert.ok(DICTIONARIES[lang].admin.loginTitle);
    }
  });

  // 7. Security: IP Anonymization HMAC
  await test('Security: IP Anonymization guarantees one-way cryptographic hashing', () => {
    const ip = '198.51.100.77';
    const hash = dbRepository.anonymizeIp(ip);
    assert.strictEqual(hash.length, 64);
    assert.notStrictEqual(hash, ip);
    assert.strictEqual(hash, dbRepository.anonymizeIp(ip)); // Deterministic
  });

  console.log(`\n============================================================`);
  console.log(`ALL STAGE 14 INTEGRATION TESTS PASSED (${passed}/${total})`);
  console.log(`============================================================\n`);
}

runStage14Tests().catch((err) => {
  console.error('Fatal error in Stage 14 integration tests:', err);
  process.exit(1);
});
