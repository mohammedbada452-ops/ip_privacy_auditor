import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const selector = read('src/components/i18n/LanguageSelector.tsx');
const ipCard = read('src/features/ip/components/IpPrimaryCard.tsx');
const flag = read('src/features/ip/components/CountryFlag.tsx');
const networkPresentation = read('src/features/home/utils/networkPresentation.ts');
const technical = read('src/features/home/components/TechnicalSummarySection.tsx');

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(selector.includes('LANGUAGE_OPTIONS.map'), 'Language selector no longer renders its language list.');
expect(!/[🇦-🇿]{2}/u.test(selector), 'Language selector still contains an emoji flag pair.');
expect(!selector.includes('getCountryFlag'), 'Language selector must not depend on country flags.');

expect(ipCard.includes("import { CountryFlag } from './CountryFlag';"), 'IP card does not import CountryFlag.');
expect(ipCard.includes('<CountryFlag countryCode={countryCode} countryName={countryName} />'), 'IP card does not render CountryFlag next to the country.');
expect(technical.includes("import { CountryFlag } from '../../ip/components/CountryFlag';"), 'Technical Summary does not import CountryFlag.');
expect(technical.includes('<CountryFlag countryCode={countryCode} countryName={countryName} />'), 'Technical Summary does not render CountryFlag next to the country.');
expect(!ipCard.includes('getCountryFlag'), 'IP card still depends on the removed emoji flag helper.');

expect(flag.includes('/api/flag/'), 'CountryFlag does not use the same-origin flag proxy.');
expect(!flag.includes('https://flagcdn.com/'), 'CountryFlag still makes a direct third-party request from the browser.');
expect(!flag.includes('svg'), 'CountryFlag must not introduce SVG flag assets.');
expect(flag.includes('code.toLowerCase()'), 'CountryFlag is not driven by the normalized provider ISO country code.');
const worker = read('worker/index.ts');
expect(worker.includes('handleCountryFlag'), 'Worker does not expose the same-origin flag proxy.');
expect(worker.includes('https://flagcdn.com/w80/'), 'Worker proxy does not use the approved PNG source.');
expect(worker.includes('caches.default'), 'Flag proxy does not use Cloudflare edge caching.');
expect(flag.includes('onError'), 'CountryFlag has no broken-image fallback.');

expect(!networkPresentation.includes('function getCountryFlag'), 'Legacy emoji country-flag helper remains in networkPresentation.');
expect(!technical.includes('getCountryFlag'), 'Technical Summary still renders a separate country flag.');

if (failures.length) {
  console.error('Country flag release verification FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Country flag release verification PASSED');
console.log('✓ Language selector has no flags');
console.log('✓ Flag is rendered in the IP location presentation');
console.log('✓ Browser uses same-origin flag endpoint; Worker fetches approved PNG source');
console.log('✓ Flag responses are edge-cacheable');
console.log('✓ Flag is driven by ISO country code with graceful failure handling');
