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
expect(!ipCard.includes('getCountryFlag'), 'IP card still depends on the removed emoji flag helper.');

expect(flag.includes('hampusborgos/country-flags@main/png100px/'), 'CountryFlag does not use the approved Hampus Borgos PNG source.');
expect(flag.includes('code.toLowerCase()'), 'CountryFlag is not driven by the normalized provider ISO country code.');
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
console.log('✓ Flag is rendered only in the IP primary location box');
console.log('✓ Flag source is Hampus Borgos country-flags PNG');
console.log('✓ Flag is driven by ISO country code with graceful failure handling');
