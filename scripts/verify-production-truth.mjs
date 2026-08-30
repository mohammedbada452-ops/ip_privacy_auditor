import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const must = (condition, message) => { if (!condition) failures.push(message); };

const geoService = read('server/services/geoip.ts');
const worker = read('worker/index.ts');
const extractor = read('server/utils/ipExtractor.ts');
const cfProvider = read('server/providers/geoip/CloudflareRequestCfProvider.ts');
const hackMyIp = read('server/providers/geoip/HackMyIPProvider.ts');
const ipInfoLite = read('server/providers/geoip/IpInfoLiteProvider.ts');
const timezone = read('src/features/browser/collectors/timezoneCollector.ts');
const privacyProtection = read('src/features/browser/collectors/privacyProtectionCollector.ts');
const appShell = read('src/components/layout/AppShell.tsx');
const packageJson = JSON.parse(read('package.json'));
const wrangler = read('wrangler.jsonc');

must(packageJson.dependencies?.vite === '^6.2.3', 'Vite dependency is missing or unexpected.');
must(packageJson.devDependencies?.vite === undefined, 'Vite must not be duplicated in devDependencies.');
must(fs.existsSync(path.join(root, 'package-lock.json')), 'package-lock.json must exist.');
must(!fs.existsSync(path.join(root, 'bun.lock')), 'bun.lock must not be shipped.');
must(packageJson.packageManager === 'npm@11.16.0', 'npm package manager must be pinned.');
must(!/"build"\s*:\s*\{[\s\S]*?"command"\s*:/.test(wrangler), 'Wrangler custom build command must be absent for Workers Builds.');
must(/"directory"\s*:\s*"\.\/dist"/.test(wrangler), 'Cloudflare assets directory must remain dist.');
must(/"NODE_ENV"\s*:\s*"production"/.test(wrangler), 'Production NODE_ENV must be explicit in Worker vars.');
must(geoService.includes("providerType === 'mock' && !['test', 'development'].includes"), 'Mock GeoIP must be blocked outside test/development.');
must(worker.toLowerCase().includes('x-privasec-observed-ip'), 'Worker must pass authoritative observed client IP into service requests.');
must(worker.includes('const cfMap') && worker.includes('headers["x-privasec-observed-ip"]'), 'Worker must construct internal edge observations from authoritative request context.');
must(extractor.includes('workerObservedIp') && extractor.includes("PRIVASEC_CLOUDFLARE_EDGE") && extractor.includes('true'), 'IP extraction must consume Worker-authoritative observed client IP.');
must(cfProvider.includes('Cloudflare request.cf metadata is unavailable for this request.'), 'Cloudflare provider must fail closed when edge metadata is unavailable.');
must(hackMyIp.includes('returned data for a different IP address'), 'HackMyIP response must be bound to requested IP.');
must(ipInfoLite.includes('returned data for a different IP address'), 'IPinfo Lite response must be bound to requested IP.');
must(timezone.includes('Browser did not expose a timezone identifier.'), 'Timezone must not default to UTC when unavailable.');
must(privacyProtection.includes('Do not fabricate a negative result'), 'Privacy protection collector must avoid fabricated negatives.');
must(read('server/db/repository.ts').includes('SERVER_SECRET_SALT is required in production'), 'Production IP pseudonymization must not use a hardcoded fallback salt.');
must(read('server/db/postgresRepository.ts').includes('SERVER_SECRET_SALT is required in production'), 'PostgreSQL IP pseudonymization must not use a hardcoded fallback salt.');
must(!read('server/db/repository.ts').includes('salt_privacy_secure_2026_audit'), 'Hardcoded production pseudonymization salt must be absent.');
must(!read('server/db/postgresRepository.ts').includes('salt_privacy_secure_2026_audit'), 'Hardcoded PostgreSQL pseudonymization salt must be absent.');
must(appShell.includes("import.meta.env.DEV ? <DesignSystemShowcase /> : <NotFoundPage />"), 'Design-system showcase must not be public in production.');

if (failures.length) {
  console.error('PRODUCTION TRUTH: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('PRODUCTION TRUTH: PASS');
