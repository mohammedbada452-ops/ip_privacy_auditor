import React, { useState } from 'react';
import { Card, StatusBadge, Badge } from '../../../components/ui';
import { Volume2, Copy, Check, Activity, HelpCircle } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { AudioData, ProfileGroup } from '../types';

export interface AudioCardProps {
  group: ProfileGroup<AudioData>;
}

export const AudioCard: React.FC<AudioCardProps> = ({ group }) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState<boolean>(false);

  const data = group.data;
  const hash = data?.hash || 'Unavailable';
  const sampleSum = data?.sampleSum ?? 0;
  const sampleLength = data?.sampleLength ?? 0;

  const isUnavailable = !data || hash === 'Unavailable' || hash === '0000000000000000' || group.status === 'UNAVAILABLE' || group.status === 'ERROR' || data?.status === 'UNAVAILABLE' || data?.status === 'ERROR' || data?.status === 'TIMEOUT';
  const isProtected = !isUnavailable && data?.status === 'BLOCKED';

  const handleCopy = () => {
    if (isUnavailable) return;
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const badgeStatus = isUnavailable ? 'neutral' : isProtected ? 'success' : 'warning';
  const badgeLabel = isUnavailable ? 'Not measured' : isProtected ? 'Blocked' : 'Signature observed';

  return (
    <Card id="audio" variant="standard" className="p-5 flex flex-col justify-between space-y-4 scroll-mt-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{t.browser.audioTitle}</h3>
            <p className="text-xs text-slate-400">{t.browser.audioSubtitle}</p>
          </div>
        </div>
        <StatusBadge status={badgeStatus} label={badgeLabel} size="sm" />
      </div>

      {/* Dynamics Compressor Metrics */}
      {!isUnavailable ? (
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>{t.browser.audioSampleSum}:</span>
            <span className="font-mono text-slate-200">{sampleSum.toFixed(4)}</span>
          </div>

          <div className="flex items-center justify-between text-slate-400 pt-1.5 border-t border-slate-900">
            <span>{t.browser.audioSampleLength}:</span>
            <span className="font-mono text-slate-200">{sampleLength} frames</span>
          </div>

          <div className="flex items-center justify-between text-slate-400 pt-1.5 border-t border-slate-900">
            <span>{t.browser.audioSampleSum}:</span>
            <span className="font-mono text-purple-300">Float32 Array Buffer</span>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
          <span>{t.ui.audioUnavailable}</span>
        </div>
      )}

      {/* Audio Hash Row */}
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between gap-3">
        <div className="overflow-hidden">
          <span className="text-slate-400 block text-[11px] mb-0.5">{t.browser.audioHashLabel}</span>
          <div className="font-mono text-xs text-slate-200 truncate select-all">
            {hash}
          </div>
        </div>

        {!isUnavailable && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0 cursor-pointer"
            title={t.ui.copyAudioHash}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
        <span className="font-mono text-[11px]">AudioContext DSP</span>
        <Badge variant={isUnavailable ? 'neutral' : isProtected ? 'success' : 'warning'} size="sm">
          {isUnavailable ? t.ui.notEvaluated : isProtected ? t.common.safe : t.ui.fingerprintingSurface}
        </Badge>
      </div>
    </Card>
  );
};
