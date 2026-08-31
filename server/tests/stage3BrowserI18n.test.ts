import { translations, validateAllLocales, SUPPORTED_LANGUAGES } from '../../src/i18n';
import fs from 'node:fs';
import path from 'node:path';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[FAIL] ${message}`);
  console.log(`[PASS] ${message}`);
}

assert(SUPPORTED_LANGUAGES.length === 6, 'Six supported languages remain configured');
assert(validateAllLocales().valid, 'All locale dictionaries remain schema-symmetric');
for (const lang of SUPPORTED_LANGUAGES) {
  const dict = translations[lang];
  assert(Boolean(dict.footer.evidenceFirst && dict.footer.rawTerminology), `Footer localization present for ${lang}`);
  assert(Boolean(dict.browser.gpcNativeAvailable && dict.browser.gpcNotSupported && dict.browser.gpcUseExtension && dict.browser.gpcRecheck), `GPC capability guidance present for ${lang}`);
}
const rem = fs.readFileSync(path.resolve(process.cwd(), 'src/features/home/utils/remediationEngine.ts'), 'utf8');
assert(rem.includes('nativeGpcSupported'), 'GPC remediation distinguishes native-supporting browsers');
assert(rem.includes('does not expose native Global Privacy Control'), 'Unsupported-browser GPC guidance is explicit');
console.log('STAGE 3 browser-awareness + localization regression checks passed.');
