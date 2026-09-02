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
 * Uses the accurate PNG country flags published by hampusborgos/country-flags.
 * The code is data-driven from the IP provider's ISO-3166 country code.
 */
export const CountryFlag: React.FC<CountryFlagProps> = ({
  countryCode,
  countryName,
  className = '',
}) => {
  const code = normalizeCountryCode(countryCode);
  if (!code) return null;

  const src = `https://cdn.jsdelivr.net/gh/hampusborgos/country-flags@main/png100px/${code.toLowerCase()}.png`;

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      width={40}
      height={26}
      className={`h-[26px] w-10 shrink-0 rounded-sm border border-slate-700/70 object-cover shadow-sm ${className}`}
      onError={(event) => {
        // Never leave a broken-image icon next to a country name if a provider
        // returns a non-standard/unsupported code.
        event.currentTarget.style.display = 'none';
      }}
      title={countryName}
    />
  );
};
