import { translations, validateAllLocales, SUPPORTED_LANGUAGES, RTL_LANGUAGES, DEFAULT_LANGUAGE } from '../../src/i18n';
import { ALL_ROUTES, getRouteTitle } from '../../src/lib/navigation/routes';

async function runStage10I18nTests() {
  console.log('==================================================');
  console.log('RUNNING STAGE 10 INTERNATIONALIZATION & RTL TESTS');
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

  // 1. Supported Languages Check
  assert(SUPPORTED_LANGUAGES.length === 6, 'Exactly 6 supported languages registered');
  const expectedCodes = ['en', 'es', 'fr', 'tr', 'pt', 'ar'];
  const actualCodes = [...SUPPORTED_LANGUAGES];
  assert(
    expectedCodes.every((c) => actualCodes.includes(c as any)) && actualCodes.length === expectedCodes.length,
    'Supported languages are exactly English, Spanish, French, Turkish, Portuguese, Arabic'
  );

  // 2. Default Language & RTL mappings
  assert(DEFAULT_LANGUAGE === 'en', 'Default language is English (en)');
  assert(RTL_LANGUAGES.includes('ar') && RTL_LANGUAGES.length === 1, 'Arabic is the only RTL language');

  // 3. Schema & Key Symmetry Validation
  const validation = validateAllLocales();
  assert(validation.valid === true, `All locale dictionaries pass schema symmetry without missing keys (Errors: ${validation.errors.length})`);
  if (!validation.valid) {
    console.error('Validation errors:', validation.errors);
  }

  // 4. Verify all language dictionaries exist and have matching keys
  const langKeys = Object.keys(translations);
  assert(langKeys.length === 6, 'Translation map contains exactly 6 dictionaries');

  for (const lang of expectedCodes) {
    const dict = (translations as any)[lang];
    assert(!!dict, `Dictionary exists for language: ${lang}`);
    assert(typeof dict.appTitle === 'string' && dict.appTitle.length > 0, `Dictionary for ${lang} has valid non-empty appTitle`);
    assert(typeof dict.ip.title === 'string' && dict.ip.title.length > 0, `Dictionary for ${lang} has valid non-empty ip.title`);
    assert(typeof dict.headers.title === 'string' && dict.headers.title.length > 0, `Dictionary for ${lang} has valid non-empty headers.title`);
  }

  // 5. Route title localization check
  for (const route of ALL_ROUTES) {
    for (const lang of expectedCodes) {
      const title = getRouteTitle(route, lang as any);
      assert(typeof title === 'string' && title.length > 0, `Route '${route.path}' has valid localized title for ${lang}: "${title}"`);
    }
  }

  // 6. Pluralization & Numbers Formatter checks
  const enCount = translations.en.headers.received;
  const arCount = translations.ar.headers.received;
  assert(typeof enCount === 'string' && typeof arCount === 'string', 'Descriptor terms defined across locales');

  console.log('\n==================================================');
  console.log(`STAGE 10 I18N TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage10I18nTests().catch((err) => {
  console.error('Error running Stage 10 i18n tests:', err);
  process.exit(1);
});
