import React from 'react';

interface CountryFlagProps {
  countryCode?: string | null;
  countryName: string;
  className?: string;
}

const normalizeCountryCode = (value?: string | null): string | null => {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
};

/**
 * Uses accurate PNG country flags through the same-origin Worker proxy.
 * The browser never requests a third-party flag host directly.
 * The code is data-driven from the IP provider's ISO-3166 country code.
 * No SVG or emoji flags are used.
 */
export const CountryFlag: React.FC<CountryFlagProps> = ({
  countryCode,
  countryName,
  className = '',
}) => {
  const code = normalizeCountryCode(countryCode);
  if (!code) return null;

  // Same-origin Worker endpoint; the Worker fetches and caches the PNG server-side.
  const src = `/api/flag/${code.toLowerCase()}`;

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      width={36}
      height={24}
      className={`h-6 w-9 shrink-0 rounded-sm border border-slate-700/70 object-cover shadow-sm ${className}`}
      onError={(event) => {
        // Never leave a broken-image icon next to a country name if a provider
        // returns a non-standard/unsupported code.
        event.currentTarget.style.display = 'none';
      }}
      title={countryName}
    />
  );
};
