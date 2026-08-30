import React from 'react';
import { Network, Server, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Card, CardBody, Badge } from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { HeaderSummaryStats } from '../types';

export interface HeaderProxyAnalysisCardProps {
  isInfrastructureProxy: boolean;
  summary: HeaderSummaryStats;
}

export const HeaderProxyAnalysisCard: React.FC<HeaderProxyAnalysisCardProps> = ({
  isInfrastructureProxy,
  summary,
}) => {
  const { t, formatNumber } = useLanguage();

  return (
    <div id="proxy-analysis-section" className="scroll-mt-6 space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
          <Network className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>{t.headers.proxyAnalysisTitle}</span>
            <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
              {summary.hasProxyHeaders
                ? `${formatNumber(summary.proxyHeadersCount)} ${t.headers.activeCount}`
                : t.headers.clean}
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            {t.headers.proxyAnalysisSubtitle}
          </p>
        </div>
      </div>

      <Card variant="standard" className="border-slate-800/80 bg-slate-900/60 p-5">
        {isInfrastructureProxy ? (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-100">
                  {t.headers.proxyInfraDetected}
                </h4>
                <Badge variant="info" size="sm">
                  Trusted Reverse Proxy Infrastructure
                </Badge>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t.headers.proxyInfraDesc}
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300">
                  x-forwarded-for: [Ingress Managed]
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300">
                  x-forwarded-proto: https
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400">
                  Zero False Deductions Applied
                </span>
              </div>
            </div>
          </div>
        ) : summary.hasProxyHeaders ? (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-100">
                  {t.headers.proxyUntrustedDetected}
                </h4>
                <Badge variant="danger" size="sm">
                  {t.headers.badgeDanger}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t.headers.proxyUntrustedDesc}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-100">
                  {t.headers.proxyDirectConnection}
                </h4>
                <Badge variant="success" size="sm">
                  {t.headers.clean}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t.headers.proxyDirectDesc}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
