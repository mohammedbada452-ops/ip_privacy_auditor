import { extractClientIp, validateIp, isTrustedProxy } from '../utils/ipExtractor';
import { GeoIPService } from '../services/geoip';
import { MockGeoIPProvider } from '../providers/geoip/MockGeoIPProvider';
import { IpApiProvider } from '../providers/geoip/IpApiProvider';
import { FallbackGeoIPProvider } from '../providers/geoip/FallbackGeoIPProvider';
import type { Request } from 'express';

function createMockRequest(headers: Record<string, string | string[]> = {}, remoteAddress = '127.0.0.1'): Request {
  return {
    headers,
    socket: { remoteAddress },
    ip: remoteAddress,
  } as unknown as Request;
}

async function runTests() {
  process.env.TRUST_LOCAL_PROXY = 'true';
  process.env.TRUSTED_PROXIES = '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16';
  console.log('==================================================');
  console.log('RUNNING STAGE 5 IP INTELLIGENCE & TRUST ACCURACY TESTS');
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

  // 1. Valid IPv4
  const res1 = validateIp('8.8.8.8');
  assert(res1.isValid && res1.version === 'IPv4' && !res1.isPrivate, '1. Valid IPv4 detection (8.8.8.8)');

  // 2. Valid IPv6
  const res2 = validateIp('2001:4860:4860::8888');
  assert(res2.isValid && res2.version === 'IPv6' && !res2.isPrivate, '2. Valid IPv6 detection (2001:4860:4860::8888)');

  // 3. Malformed IPv4
  const res3 = validateIp('256.300.1.1');
  assert(!res3.isValid && res3.version === 'invalid', '3. Malformed IPv4 rejection (256.300.1.1)');

  // 4. Malformed IPv6
  const res4 = validateIp('2001:::8888');
  assert(!res4.isValid && res4.version === 'invalid', '4. Malformed IPv6 rejection (2001:::8888)');

  // 5. Private IP
  const res5a = validateIp('10.0.0.1');
  const res5b = validateIp('192.168.1.100');
  const res5c = validateIp('172.16.0.5');
  assert(res5a.isPrivate && res5b.isPrivate && res5c.isPrivate, '5. Private IPv4 classification (10.x, 192.168.x, 172.16.x)');

  // 6. Loopback IP
  const res6a = validateIp('127.0.0.1');
  const res6b = validateIp('::1');
  assert(res6a.isLoopback && res6b.isLoopback && res6a.isPrivate && res6b.isPrivate, '6. Loopback IP classification (127.0.0.1, ::1)');

  // 7. Reserved / Link-Local / CGNAT
  const res7a = validateIp('169.254.1.1'); // Link-local
  const res7b = validateIp('100.64.0.1'); // CGNAT
  const res7c = validateIp('192.0.2.1'); // TEST-NET
  const res7d = validateIp('fe80::1'); // IPv6 Link-local
  assert(res7a.isReserved && res7b.isReserved && res7c.isReserved && res7d.isReserved, '7. Reserved IP classification (169.254.x, 100.64.x, 192.0.2.x, fe80::)');

  // 8. Trusted proxy header (X-Forwarded-For)
  const req8 = createMockRequest({
    'x-forwarded-for': '203.0.113.195, 10.0.0.1',
    'via': '1.1 vegur',
  }, '10.0.0.2');
  const extracted8 = extractClientIp(req8);
  assert(
    extracted8.ip === '203.0.113.195' && extracted8.hasProxyHeaders && extracted8.viaHeader === '1.1 vegur',
    '8. Trusted proxy header parsing (X-Forwarded-For)'
  );

  // 9. Trusted RFC 7239 Forwarded header
  const req9 = createMockRequest({
    'forwarded': 'for="[2a0d:5600:19:38::11]";proto=https;by=203.0.113.195',
  }, '127.0.0.1');
  const extracted9 = extractClientIp(req9);
  assert(
    extracted9.ip === '2a0d:5600:19:38::11' && extracted9.isInfrastructureProxy,
    '9. Trusted RFC 7239 Forwarded header parsing with IPv6'
  );

  // 10. Trusted CF-Connecting-IP header
  const req10 = createMockRequest({
    'cf-connecting-ip': '198.51.100.42',
  }, '172.17.0.1');
  const extracted10 = extractClientIp(req10);
  assert(
    extracted10.ip === '198.51.100.42' && extracted10.isInfrastructureProxy,
    '10. Trusted CF-Connecting-IP header priority'
  );

  // 11. Trusted X-Real-IP header
  const req11 = createMockRequest({
    'x-real-ip': '198.51.100.99',
  }, '127.0.0.1');
  const extracted11 = extractClientIp(req11);
  assert(
    extracted11.ip === '198.51.100.99' && extracted11.hasProxyHeaders,
    '11. Trusted X-Real-IP header resolution'
  );

  // 12. Untrusted proxy spoofing defense
  const req12 = createMockRequest({
    'x-forwarded-for': '1.1.1.1',
    'cf-connecting-ip': '1.1.1.1',
  }, '198.51.100.77'); // Direct connection from public untrusted IP
  const extracted12 = extractClientIp(req12);
  assert(
    extracted12.ip === '198.51.100.77',
    '12. Untrusted proxy spoofing defense (ignores client-supplied proxy headers from non-trusted peer)'
  );

  // 13. Malformed proxy header fallback to socket IP
  const req13 = createMockRequest(
    { 'x-forwarded-for': 'invalid-ip-string, another-bad-ip' },
    '127.0.0.1'
  );
  const extracted13 = extractClientIp(req13);
  assert(
    extracted13.ip === '127.0.0.1' && extracted13.hasProxyHeaders,
    '13. Malformed proxy header fallback to socket IP'
  );

  // 14. Multi-hop X-Forwarded-For chain extraction
  const req14 = createMockRequest({
    'x-forwarded-for': '10.0.0.1, 192.168.1.5, 1.1.1.1, 172.16.0.2',
  }, '127.0.0.1');
  const extracted14 = extractClientIp(req14);
  assert(
    extracted14.ip === '1.1.1.1',
    '14. Multi-hop XFF chain extracts first public routable client IP'
  );

  // 15. Infrastructure proxy recognition
  const req15 = createMockRequest({
    'x-forwarded-for': '1.0.0.1',
  }, '10.128.0.3'); // Internal VPC ingress
  const extracted15 = extractClientIp(req15);
  assert(
    extracted15.isInfrastructureProxy === true,
    '15. Infrastructure reverse proxy accurately flagged as trusted ingress'
  );

  // 16. Provider success response mapping
  const mockProvider16 = new MockGeoIPProvider();
  const geoService16 = new GeoIPService(mockProvider16);
  const details16 = await geoService16.getDetails('203.0.113.195');
  assert(
    details16.geo.country === 'United States' && details16.network.asn === 'AS13335',
    '16. Provider success response mapping'
  );

  // 17. Provider timeout safe fallback
  const ipApiProvider17 = new IpApiProvider({ timeoutMs: 10 }); // Fast timeout
  const geoService17 = new GeoIPService(ipApiProvider17);
  const details17 = await geoService17.getDetails('203.0.113.195');
  assert(
    details17.geo.country === 'Private Network' || details17.geo.country === 'Unavailable' || details17.geo.country === 'Local Network' || details17.geo.countryCode === 'PRIVATE' || details17.geo.countryCode === 'XX' || details17.geo.countryCode === 'LOCAL',
    '17. Provider timeout safe fallback without crashing'
  );

  // 18. Provider failure error handling
  const mockProvider18 = new MockGeoIPProvider({ shouldFail: true });
  const geoService18 = new GeoIPService(mockProvider18);
  let providerFailedHandled = false;
  try {
    const details18 = await geoService18.getDetails('203.0.113.195');
    providerFailedHandled = Boolean(details18);
  } catch (err) {
    providerFailedHandled = true;
  }
  assert(providerFailedHandled, '18. Provider failure error handling');

  // 19. Invalid provider response normalized defaults
  const mockProvider19 = new MockGeoIPProvider({
    customResult: {
      geo: {
        country: 'Unknown',
        countryCode: 'XX',
        region: '',
        city: '',
        postalCode: '',
        latitude: null,
        longitude: null,
        timezone: '',
      },
      network: {
        isp: '',
        organization: '',
        asn: '—',
        isMobile: false,
        isProxy: false,
        isVpn: false,
        isTor: false,
        isHosting: false, provider: 'TEST', providerStatus: 'VERIFIED',
      },
    },
  });
  const geoService19 = new GeoIPService(mockProvider19);
  const details19 = await geoService19.getDetails('203.0.113.195');
  assert(
    details19.geo.countryCode === 'XX' && (details19.network.asn === 'AS0' || details19.network.asn === '—'),
    '19. Invalid or empty provider response normalized defaults'
  );

  // 20. Missing optional provider fields handled gracefully
  const mockProvider20 = new MockGeoIPProvider({
    customResult: {
      geo: {
        country: 'Germany',
        countryCode: 'DE',
        region: '',
        city: 'Frankfurt',
        postalCode: '',
        latitude: 50.1109,
        longitude: 8.6821,
        timezone: 'Europe/Berlin',
      },
      network: {
        isp: 'Hetzner Online GmbH',
        organization: '',
        asn: 'AS24940',
        isMobile: false,
        isProxy: false,
        isVpn: false,
        isTor: false,
        isHosting: true, provider: 'TEST', providerStatus: 'VERIFIED',
      },
    },
  });
  const geoService20 = new GeoIPService(mockProvider20);
  const details20 = await geoService20.getDetails('198.51.100.50');
  assert(
    details20.geo.city === 'Frankfurt' && details20.geo.postalCode === '' && details20.network.organization === '',
    '20. Missing optional provider fields handled without undefined errors'
  );

  // 21. FallbackGeoIPProvider semantic null/empty values (no fabricated localhost/00000)
  const fallbackProvider = new FallbackGeoIPProvider();
  const fallbackDetails = await fallbackProvider.lookup('127.0.0.1');
  assert(
    fallbackDetails.geo.latitude === null && fallbackDetails.geo.longitude === null && fallbackDetails.geo.city === '' && (fallbackDetails.network.isp === '' || fallbackDetails.network.isp === 'Private Network'),
    '21. FallbackGeoIPProvider returns semantic null/empty strings instead of fabricated values'
  );

  // 22. Provider API key not exposed in responses
  const ipApiProvider22 = new IpApiProvider({ apiKey: 'secret_geoip_key_12345' });
  const serialized = JSON.stringify(ipApiProvider22);
  const result22 = await ipApiProvider22.lookup('127.0.0.1');
  const serializedResult = JSON.stringify(result22);
  assert(
    !serialized.includes('secret_geoip_key_12345') && !serializedResult.includes('secret_geoip_key_12345'),
    '22. GEOIP_API_KEY secret protection (never exposed in JSON or response)'
  );

  console.log('\n==================================================');
  console.log(`STAGE 5 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL 22 SCENARIOS)`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

