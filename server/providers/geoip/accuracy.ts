export type AccuracyConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export interface GeoFieldAgreement {
  country: AccuracyConfidence;
  asn: AccuracyConfidence;
  region: AccuracyConfidence;
  city: AccuracyConfidence;
  postalCode: AccuracyConfidence;
  timezone: AccuracyConfidence;
}

export interface GeoFieldObservation {
  countryCode?: string | null;
  asn?: string | null;
  region?: string | null;
  city?: string | null;
  postalCode?: string | null;
  timezone?: string | null;
}

const nonValues = new Set(['', 'UNKNOWN', 'UNAVAILABLE', 'NOT MEASURED', 'NOT ASSIGNED', '—', 'XX']);

function normalized(value: unknown): string | null {
  const v = String(value ?? '').trim();
  if (!v || nonValues.has(v.toUpperCase())) return null;
  return v.toUpperCase();
}

function agreement(values: Array<unknown>, verifiedSources: number): AccuracyConfidence {
  const present = values.map(normalized).filter((v): v is string => Boolean(v));
  if (verifiedSources <= 0 || present.length === 0) return 'UNKNOWN';
  const unique = new Set(present);
  if (verifiedSources >= 2 && unique.size === 1 && present.length >= 2) return 'HIGH';
  if (verifiedSources >= 2 && unique.size > 1) return 'LOW';
  return 'MEDIUM';
}

/**
 * Confidence is evidence quality, not a statistical probability. We only raise it
 * when independent verified sources agree on the same field. A single provider gets
 * MEDIUM rather than HIGH so the UI cannot imply unsupported precision.
 */
export function calculateGeoFieldAgreement(
  observations: GeoFieldObservation[],
  verifiedSources: number,
): GeoFieldAgreement {
  return {
    country: agreement(observations.map(o => o.countryCode), verifiedSources),
    asn: agreement(observations.map(o => o.asn), verifiedSources),
    region: agreement(observations.map(o => o.region), verifiedSources),
    city: agreement(observations.map(o => o.city), verifiedSources),
    postalCode: agreement(observations.map(o => o.postalCode), verifiedSources),
    timezone: agreement(observations.map(o => o.timezone), verifiedSources),
  };
}

export function hasMaterialGeoConflict(a: GeoFieldObservation, b: GeoFieldObservation): boolean {
  const pairs: Array<[unknown, unknown]> = [
    [a.countryCode, b.countryCode],
    [a.asn, b.asn],
    [a.region, b.region],
    [a.city, b.city],
    [a.postalCode, b.postalCode],
    [a.timezone, b.timezone],
  ];
  return pairs.some(([left, right]) => {
    const l = normalized(left);
    const r = normalized(right);
    return Boolean(l && r && l !== r);
  });
}
