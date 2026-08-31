import React, { useEffect, useRef, useState } from 'react';
import { Card, Badge, StatusBadge } from '../../../components/ui';
import { Palette, Copy, Check, ShieldCheck, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { CanvasData, ProfileGroup } from '../types';

export interface CanvasCardProps {
  group: ProfileGroup<CanvasData>;
}

export const CanvasCard: React.FC<CanvasCardProps> = ({ group }) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const data = group.data;
  const hash = data?.hash || t.ui.unavailable;
  const isRandomized = data?.isRandomized ?? false;
  const isUnavailable = !data || hash === t.ui.unavailable || group.status === 'UNAVAILABLE' || group.status === 'ERROR';

  // Render a visual replica in the preview canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isUnavailable) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 240;
    canvas.height = 70;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative geometric path
    ctx.beginPath();
    ctx.arc(40, 35, 22, 0, Math.PI * 2, true);
    ctx.arc(40, 35, 12, 0, Math.PI * 2, true);
    ctx.fillStyle = '#06b6d4';
    ctx.fill('evenodd');

    // Text rendering with emoji & subpixel anti-aliasing
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const textGrad = ctx.createLinearGradient(70, 0, 220, 0);
    textGrad.addColorStop(0, '#38bdf8');
    textGrad.addColorStop(1, '#818cf8');
    ctx.fillStyle = textGrad;
    ctx.fillText('Auditor 2D 🛡️', 75, 32);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('C:2D α-blend 1.0', 75, 48);

    // Diagonal winding line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(195, 15);
    ctx.lineTo(225, 55);
    ctx.stroke();
  }, [isUnavailable]);

  const handleCopy = () => {
    if (isUnavailable) return;
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const badgeStatus = isUnavailable ? 'neutral' : isRandomized ? 'success' : 'warning';
  const badgeLabel = isUnavailable ? t.ui.unavailable : isRandomized ? t.common.safe : t.common.detected;

  return (
    <Card id="canvas" variant="standard" className="p-5 flex flex-col justify-between space-y-4 scroll-mt-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{t.browser.canvasTitle}</h3>
            <p className="text-xs text-slate-400">{t.browser.canvasSubtitle}</p>
          </div>
        </div>
        <StatusBadge
          status={badgeStatus}
          label={badgeLabel}
          size="sm"
        />
      </div>

      {/* Visual Canvas Render Preview Box */}
      {!isUnavailable ? (
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="border border-slate-800 rounded overflow-hidden bg-slate-900 shadow-inner">
            <canvas ref={canvasRef} className="block w-[240px] h-[70px]" />
          </div>

          <div className="text-right flex flex-col items-end gap-1 text-xs">
            <span className="text-slate-400 text-[11px]">{t.browser.canvasStability}</span>
            <div className="flex items-center gap-1.5 font-mono text-slate-300">
              {isRandomized ? (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t.browser.canvasNoiseInjected}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t.browser.canvasStable}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
          <span>{t.ui.canvasUnavailable}</span>
        </div>
      )}

      {/* Hash Representation */}
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between gap-3">
        <div className="overflow-hidden">
          <span className="text-slate-400 block text-[11px] mb-0.5">{t.browser.canvasHashLabel}</span>
          <div className="font-mono text-xs text-slate-200 truncate select-all">
            {hash}
          </div>
        </div>

        {!isUnavailable && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0 cursor-pointer"
            title={t.ui.copyHash}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
        <span className="font-mono text-[11px]">2D Context Digest</span>
        <Badge variant={isUnavailable ? 'neutral' : isRandomized ? 'success' : 'warning'} size="sm">
          {isUnavailable ? 'Not Evaluated' : isRandomized ? 'Randomized' : 'Stable observed'}
        </Badge>
      </div>
    </Card>
  );
};
