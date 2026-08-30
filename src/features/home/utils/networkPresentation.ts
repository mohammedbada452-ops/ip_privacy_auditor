export interface NetworkPresentationInput {
  country?: string | null;
  countryCode?: string | null;
}

function normalizeCountryCode(value?: string | null): string | null {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

export function getCountryName(country?: string | null, countryCode?: string | null): string {
  const code = normalizeCountryCode(countryCode);
  if (code) {
    try {
      const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
      const resolved = displayNames.of(code);
      if (resolved) return resolved;
    } catch {
      // Older browsers may not expose Intl.DisplayNames; use provider value below.
    }
  }

  const raw = String(country || '').trim();
  if (!raw || /^(unknown|unavailable|not measured)$/i.test(raw)) return 'Unknown';
  return raw;
}

export function getCountryFlag(countryCode?: string | null): string {
  const code = normalizeCountryCode(countryCode);
  if (!code) return '🌐';
  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
}

export function getSafeNetworkText(value?: string | null, fallback = 'Unavailable'): string {
  const raw = String(value || '').trim();
  return raw && !/^(unknown|unavailable|not assigned|not measured|none)$/i.test(raw) ? raw : fallback;
}

export function getStatusLabel(
  value: boolean | null | undefined,
  labels: { detected: string; clear: string; unavailable: string },
): string {
  if (value === null || value === undefined) return labels.unavailable;
  return value ? labels.detected : labels.clear;
}

export type LanguageConsistencyStatus = 'MATCH' | 'MISMATCH' | 'AMBIGUOUS' | 'UNAVAILABLE';

/**
 * Extracts the region subtag from a BCP-47 language tag (e.g. "en-US" -> "US").
 * Returns null when no region subtag is present (e.g. plain "en") — a bare
 * language code does not imply any single country, so callers must not guess.
 */
export function getLanguageRegionHint(languageTag?: string | null): string | null {
  const tag = String(languageTag || '').trim();
  if (!tag) return null;
  const parts = tag.split(/[-_]/);
  if (parts.length >= 2) {
    const region = parts[1].toUpperCase();
    if (/^[A-Z]{2}$/.test(region)) return region;
  }
  return null;
}

/**
 * Evidence-based comparison of the browser's declared language region against
 * the IP-observed country. Never fabricates MATCH/MISMATCH when evidence is
 * missing or the language tag is ambiguous (no region subtag).
 */
export function getLanguageCountryConsistency(
  languageTag?: string | null,
  ipCountryCode?: string | null,
): LanguageConsistencyStatus {
  const countryCode = normalizeCountryCode(ipCountryCode);
  if (!countryCode) return 'UNAVAILABLE';
  const regionHint = getLanguageRegionHint(languageTag);
  if (!regionHint) return 'AMBIGUOUS';
  return regionHint === countryCode ? 'MATCH' : 'MISMATCH';
}
