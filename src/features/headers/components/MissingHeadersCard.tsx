import React from 'react';
import { ShieldAlert, Sparkles, ShieldCheck } from 'lucide-react';
import { Card, CardBody, Badge } from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { MissingHeaderItem } from '../types';

export interface MissingHeadersCardProps {
  missingHeaders: MissingHeaderItem[];
}

export const MissingHeadersCard: React.FC<MissingHeadersCardProps> = ({ missingHeaders }) => {
  const { t, formatNumber } = useLanguage();

  if (missingHeaders.length === 0) {
    return (
      <Card variant="standard" className="border-emerald-800/40 bg-emerald-950/20 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-emerald-300">
              {t.headers.missingHeadersCleanTitle}
            </h3>
            <p className="text-xs text-emerald-400/80 font-sans mt-0.5">
              {t.headers.missingHeadersCleanSubtitle}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="standard" className="border-amber-800/40 bg-slate-900/60 overflow-hidden">
      <div className="p-5 bg-amber-950/20 border-b border-amber-800/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              {t.headers.missingHeadersTitle}
              <Badge variant="warning" size="sm" className="font-mono">
                {formatNumber(missingHeaders.length)} {t.headers.missingCountBadge}
              </Badge>
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              {t.headers.missingHeadersSubtitle}
            </p>
          </div>
        </div>
      </div>

      <CardBody className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {missingHeaders.map((header) => (
            <div
              key={header.canonicalName}
              className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-sm font-bold text-amber-300">
                    {header.canonicalName}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {header.importance}
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-sans leading-relaxed mb-3">
                  {header.description}
                </p>

                <div className="bg-slate-900/60 border border-slate-800/60 rounded-lg p-2.5 mb-3 text-[11px] text-slate-400">
                  <span className="font-medium text-slate-300 block mb-0.5">
                    {t.headers.privacyBenefit}
                  </span>
                  <span className="font-sans">{header.benefit}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-start gap-1.5 text-xs text-cyan-300 font-sans">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>{header.recommendation}</span>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};
