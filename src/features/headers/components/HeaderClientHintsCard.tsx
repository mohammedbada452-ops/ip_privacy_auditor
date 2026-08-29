import React from 'react';
import { Cpu, ShieldCheck, AlertCircle, HelpCircle } from 'lucide-react';
import { Card, CardBody, Badge } from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { HeaderClientHintsAnalysis } from '../types';

export interface HeaderClientHintsCardProps {
  analysis: HeaderClientHintsAnalysis;
}

export const HeaderClientHintsCard: React.FC<HeaderClientHintsCardProps> = ({ analysis }) => {
  const { t, formatNumber } = useLanguage();

  const totalHints = (analysis?.lowEntropy?.length || 0) + (analysis?.highEntropy?.length || 0);

  return (
    <div id="client-hints-section" className="scroll-mt-6 space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
          <Cpu className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>{t.headers.clientHintsAnalysisTitle}</span>
            <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
              {formatNumber(totalHints)} {t.headers.activeCount}
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            {t.headers.clientHintsAnalysisSubtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Entropy (Standard) Card */}
        <Card variant="standard" className="border-slate-800/80 bg-slate-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-slate-200">
                {t.headers.lowEntropyTitle}
              </h4>
            </div>
            <Badge variant="success" size="sm" className="font-mono">
              {formatNumber(analysis?.lowEntropy?.length || 0)} {t.headers.clean}
            </Badge>
          </div>

          {analysis?.lowEntropy && analysis.lowEntropy.length > 0 ? (
            <div className="space-y-3">
              {analysis.lowEntropy.map((hint) => (
                <div
                  key={hint.canonicalName}
                  className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-cyan-300" dir="ltr">
                      {hint.canonicalName}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 uppercase">
                      {hint.entropyLevel}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-300 bg-slate-900/80 p-1.5 rounded border border-slate-800 break-all select-all" dir="ltr">
                    {hint.value}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{hint.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">
              No low-entropy client hint headers transmitted in this request.
            </div>
          )}
        </Card>

        {/* High Entropy (Fingerprinting Risk) Card */}
        <Card variant="standard" className="border-slate-800/80 bg-slate-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-slate-200">
                {t.headers.highEntropyTitle}
              </h4>
            </div>
            <Badge
              variant={analysis?.highEntropy?.length > 0 ? 'warning' : 'success'}
              size="sm"
              className="font-mono"
            >
              {analysis?.highEntropy?.length > 0
                ? `${formatNumber(analysis.highEntropy.length)} ${t.headers.observations}`
                : t.headers.clean}
            </Badge>
          </div>

          {analysis?.highEntropy && analysis.highEntropy.length > 0 ? (
            <div className="space-y-3">
              {analysis.highEntropy.map((hint) => (
                <div
                  key={hint.canonicalName}
                  className="bg-slate-950/60 border border-amber-900/30 rounded-xl p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-amber-300" dir="ltr">
                      {hint.canonicalName}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/50 uppercase">
                      {hint.entropyLevel}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-200 bg-slate-900/80 p-1.5 rounded border border-slate-800 break-all select-all" dir="ltr">
                    {hint.value}
                  </div>
                  <div className="text-[11px] text-amber-400/90 font-medium flex items-center justify-between">
                    <span>{hint.impact}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {hint.recommendation}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
              <p className="text-xs font-semibold text-slate-300">
                {t.headers.noClientHintsActive}
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm">
                Your browser protects device architecture details by suppressing high-entropy hardware model and kernel client hints.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
