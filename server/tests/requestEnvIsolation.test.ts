import assert from 'node:assert/strict';
import { dbRepository } from '../db/repository';
import { runWithRequestEnv } from '../config/requestEnv';

const ip = '198.51.100.10';
const saltA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const saltB = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

async function run() {
  const [hashA, hashB] = await Promise.all([
    runWithRequestEnv({ NODE_ENV: 'production', SERVER_SECRET_SALT: saltA }, async () => dbRepository.anonymizeIp(ip)),
    runWithRequestEnv({ NODE_ENV: 'production', SERVER_SECRET_SALT: saltB }, async () => dbRepository.anonymizeIp(ip)),
  ]);

  assert.notEqual(hashA, hashB, 'Concurrent requests must resolve the HMAC salt from their own request context');
  assert.equal(hashA.length, 64);
  assert.equal(hashB.length, 64);

  console.log('requestEnvIsolation.test.ts: PASS');
}

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
