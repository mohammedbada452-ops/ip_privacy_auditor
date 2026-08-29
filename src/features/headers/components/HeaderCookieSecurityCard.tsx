import React from 'react';
import { Cookie, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Card, Badge } from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { HeaderCookieSecurity } from '../types';

export interface HeaderCookieSecurityCardProps {
  cookieSecurity: HeaderCookieSecurity;
}

export const HeaderCookieSecurityCard: React.FC<HeaderCookieSecurityCardProps> = ({
  cookieSecurity,
}) => {
  const { t, formatNumber } = useLanguage();

  return (
    <div id="cookie-security-section" className="scroll-mt-6 space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
          <Cookie className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>{t.headers.cookieSecurityTitle}</span>
            <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
              {formatNumber(cookieSecurity?.cookieCount || 0)} {t.headers.cookieCountLabel}
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            {t.headers.cookieSecuritySubtitle}
          </p>
        </div>
      </div>

      <Card variant="standard" className="border-slate-800/80 bg-slate-900/60 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Detected Cookies & Masking Status */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {t.headers.cookieProtectionLabel}
              </span>
              <Lock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              {cookieSecurity?.isProtected ? (
                <div className="space-y-1">
                  <Badge variant="success" size="sm" className="font-semibold">
                    {t.headers.cookieEnforced}
                  </Badge>
                  <p className="text-[11px] text-slate-400">
                    Raw cookie identifiers replaced with cryptographic salt hash to preserve privacy during transport analysis.
                  </p>
                </div>
              ) : (
                <Badge variant="info" size="sm">
                  {t.headers.clean}
                </Badge>
              )}
            </div>
          </div>

          {/* Server Response Attributes vs Request Headers */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Cookie Security Attributes
              </span>
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-3 space-y-1">
              <div className="text-sm font-semibold text-slate-200">
                Server Response Directives (Set-Cookie)
              </div>
              <p className="text-[11px] text-slate-400">
                Security flags (Secure, HttpOnly, SameSite, Partitioned) are issued by web servers in Set-Cookie response headers. Request Cookie headers transmit name-value pairs only.
              </p>
            </div>
          </div>

          {/* Security Rationale */}
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {t.headers.cookieReasonLabel}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                {cookieSecurity?.reason || 'Cookies are automatically masked and never logged in cleartext.'}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
