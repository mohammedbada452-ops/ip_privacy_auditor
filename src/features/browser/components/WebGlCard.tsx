import React, { useState } from 'react';
import { Card, StatusBadge, Badge } from '../../../components/ui';
import { Cpu, Copy, Check, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { WebGlData, ProfileGroup } from '../types';

export interface WebGlCardProps {
  group: ProfileGroup<WebGlData>;
}

export const WebGlCard: React.FC<WebGlCardProps> = ({ group }) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState<boolean>(false);

  const data = group.data;
  const exposedRenderer = data?.unmaskedRenderer || null;
  const exposedVendor = data?.unmaskedVendor || null;
  const renderer = data?.renderer || null;
  const vendor = data?.vendor || null;
  const hardwareHash = data?.hardwareHash || t.ui.unavailable;

  const isUnavailable = !data || group.status === 'UNAVAILABLE' || group.status === 'ERROR' || data?.status === 'UNAVAILABLE' || data?.status === 'ERROR' || data?.status === 'BLOCKED';
  const isMasked = !isUnavailable && data?.status === 'MASKED';
  const isExposed = !isUnavailable && data?.status === 'EXPOSED' && data.isUnmasked === true;

  const handleCopy = () => {
    if (isUnavailable) return;
    navigator.clipboard.writeText(hardwareHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const badgeStatus = isUnavailable ? 'neutral' : isMasked ? 'success' : 'warning';
  const badgeLabel = isUnavailable ? t.ui.unavailable : isMasked ? t.common.safe : t.common.detected;

  return (
    <Card id="webgl" variant="standard" className="p-5 flex flex-col justify-between space-y-4 scroll-mt-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{t.browser.webglTitle}</h3>
            <p className="text-xs text-slate-400">{t.browser.webglSubtitle}</p>
          </div>
        </div>
        <StatusBadge
          status={badgeStatus}
          label={badgeLabel}
          size="sm"
        />
      </div>

      {/* GPU Unmasked Renderer & Vendor */}
      {!isUnavailable ? (
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] mb-0.5">{t.browser.webglUnmaskedRenderer}</span>
            <div className="font-mono text-slate-100 font-medium break-words">
              {exposedRenderer || renderer || t.ui.unavailable}
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-slate-400 block text-[11px]">{t.browser.webglUnmaskedVendor}</span>
              <span className="font-mono text-slate-300">{exposedVendor || vendor || t.ui.unavailable}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">{t.browser.webglHardware}</span>
              <span className="font-mono text-indigo-300 flex items-center gap-1">
                {isExposed ? <Eye className="w-3 h-3 text-amber-400" /> : <EyeOff className="w-3 h-3 text-emerald-400" />}
                {isExposed ? t.ui.hardwareDisclosed : (exposedRenderer ? t.ui.rendererMasked : t.ui.notEvaluated)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
          <span>{t.ui.webglUnavailable}</span>
        </div>
      )}

      {/* Hardware Digest Row */}
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between gap-3">
        <div className="overflow-hidden">
          <span className="text-slate-400 block text-[11px] mb-0.5">{t.browser.webglHardwareHash}</span>
          <div className="font-mono text-xs text-slate-200 truncate select-all">
            {hardwareHash}
          </div>
        </div>

        {!isUnavailable && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0 cursor-pointer"
            title={t.ui.copyDigest}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
        <span className="font-mono text-[11px]">WEBGL_debug_renderer_info</span>
        <Badge variant={isUnavailable ? 'neutral' : isMasked ? 'success' : 'warning'} size="sm">
          {isUnavailable ? t.ui.notEvaluated : isMasked ? t.browser.webglMasked : isExposed ? t.browser.webglExposed : t.common.detected}
        </Badge>
      </div>
    </Card>
  );
};
