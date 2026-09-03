import React from 'react';
import { ShieldCheck, Check, Shield } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { PrivacyFactor } from '@packages/api-contract';

interface ActiveProtectionsSectionProps {
  factors: PrivacyFactor[];
}

export const ActiveProtectionsSection: React.FC<ActiveProtectionsSectionProps> = ({ factors }) => {
  const { t } = useLanguage();

  // Helper to determine if a factor represents an active, verified positive protection mechanism
  const isPositiveProtection = (f: PrivacyFactor): boolean => {
    if (!f.available) return false;
    const valStr = typeof f.currentValue === 'string' ? f.currentValue : String(f.currentValue ?? '');
    if (f.id === 'HDR_SEC_GPC_SIGNAL' && valStr.includes('Active')) return true;
    if (f.id === 'HDR_DNT_SIGNAL' && valStr.includes('DNT: 1')) return true;
    if (f.id === 'FP_WEBRTC_LEAK') {
      const metadata = (f as PrivacyFactor & { metadata?: Record<string, unknown> }).metadata;
      const mdnsProtectionConfirmed = metadata?.mdnsProtectionConfirmed === true;
      if (mdnsProtectionConfirmed) return true;
    }
    if (f.id === 'NET_TOR_DETECTED' && f.detected) return true;
    if (f.id === 'NET_VPN_DETECTED' && f.detected) return true;
    if (f.id === 'FP_WEBGL_HARDWARE' && f.status === 'SAFE') return true;
    if (f.id === 'FP_CANVAS_UNIQUE' && f.status === 'SAFE') return true;
    if (f.id === 'HDR_PROXY_FLAGS' && valStr.includes('Protected Infrastructure')) return true;
    return false;
  };

  // Find all verified protective factors with 0 deduction
  const verifiedProtections = factors.filter(
    (f) => isPositiveProtection(f) && f.points === 0 && f.available
  );

  // Find safe baselines where threats/risks were audited and not detected
  const noRiskFactors = factors.filter(
    (f) => !isPositiveProtection(f) && (f.status === 'SAFE' || !f.detected || f.status === 'NOT_DETECTED') && f.points === 0 && f.available
  );

  const totalProtectionsAndBaselines = verifiedProtections.length + noRiskFactors.length;

  return (
    <section id="active-protections-section" className="mb-8 scroll-mt-24" aria-labelledby="protections-heading">
      <div className="mb-4">
        <h2 id="protections-heading" className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          {t.home.protections.title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 font-sans mt-0.5">
          {t.home.protections.subtitle}
        </p>
      </div>

      {totalProtectionsAndBaselines === 0 ? (
        <div className="p-6 rounded-xl bg-slate-900/30 border border-slate-800 text-center text-xs text-slate-400 font-sans">
          {t.home.protections.noProtections}
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. Verified Active Protections */}
          {verifiedProtections.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  {t.ui.verifiedProtections} ({verifiedProtections.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {verifiedProtections.map((factor) => (
                  <div
                    key={factor.id}
                    className="p-3.5 rounded-xl bg-slate-900/50 border border-emerald-500/30 flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-mono font-bold text-slate-200 block truncate">
                          {factor.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 shrink-0">
                          PROTECTED
                        </span>
                      </div>
                      <span className="text-[11px] font-sans text-slate-400 line-clamp-2 mt-0.5">
                        {factor.reason || factor.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Audited Baselines (No Risk Detected) */}
          {noRiskFactors.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  {t.ui.cleanSecurityBaselines} ({noRiskFactors.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {noRiskFactors.map((factor) => (
                  <div
                    key={factor.id}
                    className="p-3.5 rounded-xl bg-slate-900/30 border border-slate-800 flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-mono font-medium text-slate-300 block truncate">
                          {factor.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                          NO RISK DETECTED
                        </span>
                      </div>
                      <span className="text-[11px] font-sans text-slate-400 line-clamp-2 mt-0.5">
                        {factor.reason || factor.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

