import assert from 'node:assert/strict';
import { rdapService } from '../services/rdap';
import { reverseDnsService } from '../services/reverseDns';
import { IpInfoLiteProvider } from '../providers/geoip/IpInfoLiteProvider';

async function main() {
  const rdapPrivate = await rdapService.lookup('192.168.1.1');
  assert.equal(rdapPrivate.status, 'NOT_MEASURED');

  const rdnsPrivate = await reverseDnsService.lookup('10.0.0.1');
  assert.equal(rdnsPrivate.status, 'NOT_MEASURED');

  const noTokenProvider = new IpInfoLiteProvider({ token: '' });
  await assert.rejects(() => noTokenProvider.lookup('8.8.8.8'), /token is not configured/i);

  console.log('FREE INTELLIGENCE SERVICES: PASS');
}

void main().catch((error) => {
  console.error('FREE INTELLIGENCE SERVICES: FAIL');
  console.error(error);
  process.exit(1);
});
