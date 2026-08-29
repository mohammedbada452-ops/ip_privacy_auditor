import assert from 'assert';
import {
  RateLimiter,
  securityHeaders,
  corsMiddleware,
} from '../middleware/security';
import { errorHandler } from '../middleware/errorHandler';
import { validateBrowserFingerprintPayload, PayloadValidationError } from '../utils/payloadValidator';
import { validateIp } from '../utils/ipExtractor';
import { dbRepository } from '../db/repository';
import { IpApiProvider } from '../providers/geoip/IpApiProvider';
import { FallbackGeoIPProvider } from '../providers/geoip/FallbackGeoIPProvider';

console.log('--- RUNNING STAGE 13 PRODUCTION HARDENING & SECURITY TESTS ---');

async function testSecurityHeaders() {
  console.log('Testing: HTTP Security Headers...');
  const headers: Record<string, string> = {};
  const mockReq: any = { headers: {} };
  const mockRes: any = {
    setHeader: (key: string, value: string) => {
      headers[key] = value;
    },
  };

  let nextCalled = false;
  securityHeaders(mockReq, mockRes, () => {
    nextCalled = true;
  });

  assert.strictEqual(nextCalled, true, 'Next function should be called');
  assert.strictEqual(headers['X-Content-Type-Options'], 'nosniff', 'Must include nosniff');
  assert.strictEqual(headers['Referrer-Policy'], 'strict-origin-when-cross-origin', 'Must include Referrer-Policy');
  assert.strictEqual(headers['X-Download-Options'], 'noopen', 'Must include X-Download-Options');
  assert.strictEqual(headers['X-DNS-Prefetch-Control'], 'off', 'Must include X-DNS-Prefetch-Control: off');
  assert.ok(headers['Content-Security-Policy'].includes("default-src 'self'"), 'CSP must define default-src');
  assert.ok(headers['Permissions-Policy'].includes('camera=()'), 'Permissions-Policy must restrict sensitive APIs');

  console.log('✓ HTTP Security Headers verified successfully.');
}

async function testCorsMiddleware() {
  console.log('Testing: CORS Middleware...');
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let ended = false;

  const mockOptionsReq: any = {
    method: 'OPTIONS',
    path: '/api/admin/scans',
    headers: { origin: 'https://example.com' },
  };
  const mockOptionsRes: any = {
    setHeader: (k: string, v: string) => {
      headers[k] = v;
    },
    status: (code: number) => {
      statusCode = code;
      return {
        end: () => {
          ended = true;
        },
      };
    },
  };

  corsMiddleware(mockOptionsReq, mockOptionsRes, () => {});
  assert.strictEqual(statusCode, 204, 'OPTIONS preflight must return status 204');
  assert.strictEqual(ended, true, 'OPTIONS response must end cleanly');
  assert.ok(headers['Access-Control-Allow-Methods'].includes('POST'), 'CORS methods must include POST');

  console.log('✓ CORS Middleware verified successfully.');
}

async function testRateLimiter() {
  console.log('Testing: In-Memory Sliding Window Rate Limiter...');
  const limiter = new RateLimiter(1000, 3); // 3 requests per second limit

  const ip = '198.51.100.99';
  const r1 = limiter.check(ip);
  assert.strictEqual(r1.isLimited, false, 'Req 1 should be allowed');
  assert.strictEqual(r1.remaining, 2);

  const r2 = limiter.check(ip);
  assert.strictEqual(r2.isLimited, false, 'Req 2 should be allowed');
  assert.strictEqual(r2.remaining, 1);

  const r3 = limiter.check(ip);
  assert.strictEqual(r3.isLimited, false, 'Req 3 should be allowed');
  assert.strictEqual(r3.remaining, 0);

  const r4 = limiter.check(ip);
  assert.strictEqual(r4.isLimited, true, 'Req 4 should be rate limited');
  assert.ok(r4.retryAfterSeconds >= 1, 'Retry after seconds must be >= 1');

  limiter.reset(ip);
  const r5 = limiter.check(ip);
  assert.strictEqual(r5.isLimited, false, 'Resetting IP must restore allowance');

  limiter.destroy();
  console.log('✓ Rate Limiter verified successfully.');
}

async function testErrorHandler() {
  console.log('Testing: Production Error Handler...');

  let sentStatus = 0;
  let sentJson: any = null;

  const mockReq: any = {
    method: 'POST',
    originalUrl: '/api/analyze/browser',
    requestId: 'req_test_123',
  };

  const mockRes: any = {
    status: (code: number) => {
      sentStatus = code;
      return {
        json: (data: any) => {
          sentJson = data;
        },
      };
    },
  };

  // Test 1: Payload Too Large
  const tooLargeErr: any = new Error('request entity too large');
  tooLargeErr.type = 'entity.too.large';
  tooLargeErr.status = 413;

  errorHandler(tooLargeErr, mockReq, mockRes, () => {});
  assert.strictEqual(sentStatus, 413);
  assert.strictEqual(sentJson.success, false);
  assert.strictEqual(sentJson.error.code, 'PAYLOAD_TOO_LARGE');

  // Test 2: Malformed JSON
  const malformedJsonErr: any = new SyntaxError('Unexpected token in JSON');
  malformedJsonErr.body = '{"malformed": ';

  errorHandler(malformedJsonErr, mockReq, mockRes, () => {});
  assert.strictEqual(sentStatus, 400);
  assert.strictEqual(sentJson.success, false);
  assert.strictEqual(sentJson.error.code, 'INVALID_JSON_BODY');

  console.log('✓ Error Handler verified successfully.');
}

async function testPayloadValidatorHardening() {
  console.log('Testing: Payload Validator Input Bounds...');

  // Null input returns null
  assert.strictEqual(validateBrowserFingerprintPayload(null), null);

  // Overlong canvas hash throws
  assert.throws(() => {
    validateBrowserFingerprintPayload({ canvasHash: 'a'.repeat(200) });
  }, PayloadValidationError);

  // Invalid CPU cores throws
  assert.throws(() => {
    validateBrowserFingerprintPayload({ hardware: { cpuCores: 2048 } });
  }, PayloadValidationError);

  // Negative screen width throws
  assert.throws(() => {
    validateBrowserFingerprintPayload({ screen: { width: -100 } });
  }, PayloadValidationError);

  // Excessive languages array throws
  assert.throws(() => {
    validateBrowserFingerprintPayload({ languages: new Array(50).fill('en') });
  }, PayloadValidationError);

  // Valid payload passes
  const valid = validateBrowserFingerprintPayload({
    canvasHash: '9a8b7c6d5e4f',
    webgl: { vendor: 'Google Inc.', renderer: 'ANGLE' },
    hardware: { cpuCores: 8, deviceMemory: 16, touchPoints: 0 },
    screen: { width: 1920, height: 1080, colorDepth: 24, pixelRatio: 1 },
    timezone: 'UTC',
    languages: ['en-US', 'en'],
    securityFlags: { isAutomation: false, isAdBlockActive: false, isIncognito: false },
  });

  if (!valid) throw new Error('Valid browser fingerprint payload unexpectedly returned null');
  assert.strictEqual(valid.canvasHash, '9a8b7c6d5e4f');

  console.log('✓ Payload Validator Bounds verified successfully.');
}

async function testIpValidatorHardening() {
  console.log('Testing: IP Validation & Anonymization...');

  assert.strictEqual(validateIp('192.168.1.1').isValid, true);
  assert.strictEqual(validateIp('192.168.1.1').isPrivate, true);
  assert.strictEqual(validateIp('8.8.8.8').isValid, true);
  assert.strictEqual(validateIp('8.8.8.8').isPrivate, false);
  assert.strictEqual(validateIp('invalid.ip.string').isValid, false);
  assert.strictEqual(validateIp('999.999.999.999').isValid, false);

  // Salted HMAC anonymization
  const hash1 = dbRepository.anonymizeIp('8.8.8.8');
  const hash2 = dbRepository.anonymizeIp('8.8.8.8');
  const hashOther = dbRepository.anonymizeIp('1.1.1.1');

  assert.strictEqual(hash1, hash2, 'HMAC must be deterministic');
  assert.notStrictEqual(hash1, hashOther, 'Different IPs must produce different hashes');
  assert.strictEqual(hash1.length, 64, 'HMAC-SHA256 must be 64 hex characters');

  console.log('✓ IP Validation & Anonymization verified successfully.');
}

async function testGeoIpResilience() {
  console.log('Testing: GeoIP Provider Resilience & Fallback...');

  const fallback = new FallbackGeoIPProvider();
  const localResult = await fallback.lookup('127.0.0.1');
  assert.ok(localResult.geo.countryCode === 'PRIVATE' || localResult.geo.countryCode === 'LOCAL');
  assert.strictEqual(localResult.network.isProxy, false);

  const ipApi = new IpApiProvider({ timeoutMs: 100 });
  // Lookup private IP should immediately return fallback without external network
  const privateResult = await ipApi.lookup('10.0.0.1');
  assert.ok(privateResult.geo.countryCode === 'PRIVATE' || privateResult.geo.countryCode === 'LOCAL');

  console.log('✓ GeoIP Provider Resilience verified successfully.');
}

async function runAllTests() {
  try {
    await testSecurityHeaders();
    await testCorsMiddleware();
    await testRateLimiter();
    await testErrorHandler();
    await testPayloadValidatorHardening();
    await testIpValidatorHardening();
    await testGeoIpResilience();

    console.log('\n============================================================');
    console.log('ALL STAGE 13 PRODUCTION HARDENING TESTS PASSED (7/7)');
    console.log('============================================================');
  } catch (err) {
    console.error('\n❌ STAGE 13 TEST SUITE FAILED:', err);
    process.exit(1);
  }
}

runAllTests();
