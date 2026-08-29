/**
 * Centralized Design Tokens for Privacy & Browser Intelligence Auditor
 * Based on docs/reference/UI_SPEC.md
 */

export const colors = {
  background: {
    main: '#0B0F17',
    alt: '#0F172A',
  },
  surface: {
    base: '#0F172A',
    card: '#1E293B',
    elevated: '#334155',
  },
  border: {
    subtle: '#1E293B',
    default: '#334155',
    focus: '#06B6D4',
  },
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',
    inverse: '#0F172A',
  },
  accent: {
    cyan: '#06B6D4',
    lightCyan: '#38BDF8',
  },
  status: {
    success: {
      main: '#10B981',
      light: '#34D399',
      bg: 'rgba(16, 185, 129, 0.1)',
      border: 'rgba(16, 185, 129, 0.25)',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
      bg: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.25)',
    },
    danger: {
      main: '#EF4444',
      light: '#F87171',
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.25)',
    },
    info: {
      main: '#06B6D4',
      light: '#38BDF8',
      bg: 'rgba(6, 182, 212, 0.1)',
      border: 'rgba(6, 182, 212, 0.25)',
    },
    neutral: {
      main: '#64748B',
      light: '#94A3B8',
      bg: 'rgba(100, 116, 139, 0.1)',
      border: 'rgba(100, 116, 139, 0.25)',
    },
  },
} as const;

export const radii = {
  sm: 'rounded-sm',     // 2px
  default: 'rounded-md',// 6px
  lg: 'rounded-lg',     // 8px
  xl: 'rounded-xl',     // 12px (spec default card radius)
  full: 'rounded-full',
} as const;

export const typography = {
  fontFamily: {
    sans: 'font-sans',
    mono: 'font-mono',
  },
  sizes: {
    xs: 'text-xs',      // 12px
    sm: 'text-sm',      // 14px
    base: 'text-base',  // 16px
    lg: 'text-lg',      // 18px
    xl: 'text-xl',      // 20px
    '2xl': 'text-2xl',    // 24px
    '3xl': 'text-3xl',    // 30px
    '4xl': 'text-4xl',    // 36px
  },
} as const;

export type SemanticStatus =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'unknown'
  | 'unavailable'
  | 'detected'
  | 'not-detected';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
