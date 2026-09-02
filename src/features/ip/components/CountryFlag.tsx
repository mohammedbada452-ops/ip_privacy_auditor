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
 * Uses the accurate PNG country flags served by FlagCDN/Flagpedia.
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

  // FlagCDN provides current PNG renders for the 254 ISO country flags.
  const src = `https://flagcdn.com/w80/${code.toLowerCase()}.png`;

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
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
