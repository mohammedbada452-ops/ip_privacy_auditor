import assert from 'node:assert/strict';
import { isTrustedProxy, validateIp } from '../utils/ipExtractor';
import { getSecuritySaltConfig } from '../config';

const originalEnv = { ...process.env };

try {
  process.env.NODE_ENV = 'production';
  delete process.env.TRUST_PROXY;
  process.env.TRUSTED_PROXY_CIDRS = '10.0.0.0/8,2001:db8::/32';

  assert.equal(isTrustedProxy('10.10.10.10'), true);
  assert.equal(isTrustedProxy('10.10.10.250'), true);
  assert.equal(isTrustedProxy('11.10.10.10'), false);
  assert.equal(isTrustedProxy('2001:db8::42'), true);
  assert.equal(isTrustedProxy('2001:4860:4860::8888'), false);

  process.env.SERVER_SECRET_SALT = '0123456789abcdef0123456789abcdef';
  assert.equal(getSecuritySaltConfig().serverSecretSalt?.length, 32);
  delete process.env.SERVER_SECRET_SALT;
  assert.throws(() => getSecuritySaltConfig(), /SERVER_SECRET_SALT/);

  assert.equal(validateIp('203.0.113.88').isReserved, true);
  assert.equal(validateIp('8.8.8.8').isPublic, true);
  console.log('finalHardening.test.ts: PASS');
} finally {
  process.env = originalEnv;
}
