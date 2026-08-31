import React from 'react';

export interface CountryFlagProps {
  countryCode?: string | null;
  countryName?: string;
  className?: string;
}

const normalize = (value?: string | null) => {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
};

/**
 * Local, dependency-free SVG flags for the countries currently used by the
 * live network examples. Unknown countries fall back to a compact ISO badge
 * instead of a platform-dependent emoji, so RTL/desktop rendering stays stable.
 */
export const CountryFlag: React.FC<CountryFlagProps> = ({ countryCode, countryName, className = '' }) => {
  const code = normalize(countryCode);
  const label = countryName || code || 'Unknown country';
  const common = {
    className: `country-flag ${className}`,
    role: 'img' as const,
    'aria-label': `${label} flag`,
    viewBox: '0 0 48 32',
    xmlns: 'http://www.w3.org/2000/svg',
  };

  if (code === 'SY') {
    return (
      <svg {...common}>
        <rect width="48" height="32" fill="#000" />
        <rect width="48" height="21.333" fill="#fff" />
        <rect width="48" height="10.666" fill="#1e8f4d" />
        <path fill="#d00000" d="M14 16l1.8-1.4-.7-2.2 2.1 1.3 2.1-1.3-.7 2.2 1.8 1.4h-2.3l-.9 2.2-.9-2.2z" />
        <path fill="#d00000" d="M24 16l1.8-1.4-.7-2.2 2.1 1.3 2.1-1.3-.7 2.2 1.8 1.4h-2.3l-.9 2.2-.9-2.2z" />
        <path fill="#d00000" d="M34 16l1.8-1.4-.7-2.2 2.1 1.3 2.1-1.3-.7 2.2 1.8 1.4h-2.3l-.9 2.2-.9-2.2z" />
      </svg>
    );
  }

  if (code === 'TR') {
    return (
      <svg {...common}>
        <rect width="48" height="32" fill="#e30a17" />
        <circle cx="22" cy="16" r="7" fill="#fff" />
        <circle cx="24" cy="16" r="5.5" fill="#e30a17" />
        <path fill="#fff" d="M31.5 16l6.2-2-3.8 3.8.7 5.9-3.9-4-5.7 1.2 3.4-4.9-3.4-4.9 5.7 1.2 3.9-4z" transform="scale(.72) translate(11 6.5)" />
      </svg>
    );
  }

  if (code === 'NO') {
    return (
      <svg {...common}>
        <rect width="48" height="32" fill="#ba0c2f" />
        <rect x="13" width="8" height="32" fill="#fff" />
        <rect y="10" width="48" height="8" fill="#fff" />
        <rect x="15" width="4" height="32" fill="#00205b" />
        <rect y="12" width="48" height="4" fill="#00205b" />
      </svg>
    );
  }

  return (
    <span className={`country-flag country-flag--fallback ${className}`} role="img" aria-label={`${label} flag`}>
      {code || '??'}
    </span>
  );
};
