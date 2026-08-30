import React, { useState } from 'react';
import {
  Card,
  Button,
  ScoreGauge,
  StatusBadge,
  Badge,
} from '../../../components/ui';
import {
  Shield,
  RefreshCw,
  Download,
  Copy,
  Check,
  Cpu,
  Eye,
  Radio,
  Fingerprint,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { BrowserProfile } from '../types';
import type { PrivacyScoreAnalysis } from '@packages/api-contract';

export interface BrowserOverviewCardProps {
  profile: BrowserProfile;
  privacyAnalysis: PrivacyScoreAnalysis | null;
  isScanning: boolean;
  isAnalyzing: boolean;
  onRescan: () => void;
  onOpenExport: () => void;
  onSelectMetric?: (metricKey: 'total_signals' | 'hardware_leaks' | 'privacy_protections' | 'webrtc_status') => void;
}

export const BrowserOverviewCard: React.FC<BrowserOverviewCardProps> = ({
  profile,
  privacyAnalysis,
  isScanning,
  isAnalyzing,
  onRescan,
  onOpenExport,
  onSelectMetric,
}) => {
  const { t, formatScore } = useLanguage();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const canvasData = profile.groups.GRAPHICS?.data as { canvas?: { hash?: string }; hash?: string } | null;
  const webglData = profile.groups.GRAPHICS?.data as { webgl?: { hardwareHash?: string }; hardwareHash?: string } | null;
  const audioData = profile.groups.AUDIO?.data as { hash?: string } | null;
  const payload = profile.fingerprintPayload;
  const webRtcData = profile.groups.WEBRTC?.data as { status?: string; leakDetected?: boolean } | null;

  const compositeHashParts = [
    payload?.canvasHash || canvasData?.canvas?.hash || canvasData?.hash,
    webglData?.webgl?.hardwareHash || webglData?.hardwareHash || payload?.webgl?.renderer,
    payload?.audioHash || audioData?.hash,
  ].map((value) => value ? value.slice(0, 8) : undefined);
  const compositeHash = compositeHashParts.every(Boolean)
    ? compositeHashParts.join('-')
    : 'NOT_AVAILABLE';

  const score = privacyAnalysis?.privacyScore ?? null;
  const isBusy = isScanning || isAnalyzing;

  return (
    <Card variant="standard" className="p-6 overflow-hidden relative">
      {/* Background Subtle Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <div className="relative z-10 space-y-6">
        {/* Top Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400 shrink-0 mt-0.5">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-100 tracking-tight">
                  {t.browser.title}
                </h1>
                <Badge variant="info" size="sm">
                  {t.common.liveSystem}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {t.browser.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenExport}
              leftIcon={<Download className="w-4 h-4" />}
            >
              {t.browser.exportProfile}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onRescan}
              disabled={isBusy}
              leftIcon={
                <RefreshCw className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`} />
              }
            >
              {isBusy ? t.common.scanning : t.browser.rescan}
            </Button>
          </div>
        </div>

        {/* Core Metrics & Privacy Gauge Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Privacy Score Gauge */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            {privacyAnalysis ? (
              <>
                <ScoreGauge
                  score={score ?? 0}
                  size="md"
                  label={t.privacy.scoreTitle}
                />
                <div className="mt-3 text-center">
                  <span className="text-xs font-mono text-slate-400">
                    {t.ui.verifiedPrivacyScore}: <span className="font-bold text-cyan-400">{formatScore(score ?? 0)}</span> / 100
                  </span>
                </div>
              </>
            ) : (
              <div className="py-10 text-center">
                <div className="text-sm font-semibold text-slate-200">{t.ui.auditNotCompleted}</div>
                <div className="mt-2 text-xs text-slate-500 max-w-xs">{t.ui.runScanToCalculate}</div>
              </div>
            )}
          </div>

          {/* Quick Metrics & Leaks Summary (Interactive Diagnostic Buttons) */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Signals */}
            <button
              id="metric-total-signals-btn"
              type="button"
              onClick={() => onSelectMetric?.('total_signals')}
              aria-label={t.browser.totalSignals}
              className="p-4 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-xl flex flex-col justify-between text-left transition-all group focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none cursor-pointer"
            >
              <div className="flex items-center justify-between text-slate-400 w-full">
                <span className="text-xs font-medium group-hover:text-cyan-400 transition-colors">{t.browser.totalSignals}</span>
                <Layers className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono text-slate-100 group-hover:text-cyan-300 transition-colors">
                  {profile.summary.totalSignalsEvaluated}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {t.ui.collectorsActive.replace('{count}', String(12))}
                </div>
              </div>
            </button>

            {/* Hardware Leaks / Exposures */}
            <button
              id="metric-hardware-leaks-btn"
              type="button"
              onClick={() => onSelectMetric?.('hardware_leaks')}
              aria-label={t.ui.confirmedFingerprintingSignals}
              className="p-4 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl flex flex-col justify-between text-left transition-all group focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none cursor-pointer"
            >
              <div className="flex items-center justify-between text-slate-400 w-full">
                <span className="text-xs font-medium group-hover:text-amber-400 transition-colors">{t.browser.confirmedFingerprintExposures}</span>
                <Cpu className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono text-amber-400 group-hover:text-amber-300 transition-colors">
                  {profile.summary.exposedHardwareSignals}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {t.ui.confirmedFingerprintingSignals}
                </div>
              </div>
            </button>

            {/* Active Privacy Protections */}
            <button
              id="metric-privacy-protections-btn"
              type="button"
              onClick={() => onSelectMetric?.('privacy_protections')}
              aria-label={t.browser.privacyProtections}
              className="p-4 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl flex flex-col justify-between text-left transition-all group focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none cursor-pointer"
            >
              <div className="flex items-center justify-between text-slate-400 w-full">
                <span className="text-xs font-medium group-hover:text-emerald-400 transition-colors">{t.browser.privacyProtections}</span>
                <Shield className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono text-emerald-400 group-hover:text-emerald-300 transition-colors">
                  {profile.summary.privacyProtectionsActive}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {t.ui.privacyControlSignals}
                </div>
              </div>
            </button>

            {/* WebRTC Leak Status */}
            <button
              id="metric-webrtc-status-btn"
              type="button"
              onClick={() => onSelectMetric?.('webrtc_status')}
              aria-label={t.ui.inspectWebrtc}
              className="p-4 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-xl flex flex-col justify-between text-left transition-all group focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none cursor-pointer"
            >
              <div className="flex items-center justify-between text-slate-400 w-full">
                <span className="text-xs font-medium group-hover:text-cyan-400 transition-colors">{t.browser.webrtcStatus}</span>
                <Radio className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="mt-3">
                <StatusBadge
                  status={webRtcData?.leakDetected ? 'danger' : 'success'}
                  label={webRtcData?.leakDetected ? t.common.danger : t.common.safe}
                  size="sm"
                />
                <div className="text-[11px] text-slate-400 mt-1">
                  {webRtcData?.leakDetected ? 'Local IP leak' : 'mDNS / Protected'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Composite & Sub-Vector Hashes Bar */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-sans">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              {t.browser.compositeFingerprint}
            </span>
            <button
              onClick={() => copyToClipboard(compositeHash, 'composite')}
              className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {copiedKey === 'composite' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">{t.common.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>{t.common.copy}</span>
                </>
              )}
            </button>
          </div>

          <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg font-mono text-xs text-cyan-300 break-all select-all flex items-center justify-between">
            <span>{compositeHash}</span>
          </div>

          {/* Sub-Vector Micro Hashes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            {/* Canvas Hash */}
            <div className="flex items-center justify-between p-2 bg-slate-900/50 border border-slate-800/80 rounded-lg font-mono">
              <span className="text-slate-400 text-[11px]">{t.browser.canvasSignature}:</span>
              <span className="text-slate-200 font-medium">
                {canvasData?.hash ? `${canvasData.hash.slice(0, 10)}...` : t.common.na}
              </span>
            </div>

            {/* WebGL Hash */}
            <div className="flex items-center justify-between p-2 bg-slate-900/50 border border-slate-800/80 rounded-lg font-mono">
              <span className="text-slate-400 text-[11px]">{t.browser.webglHardware}:</span>
              <span className="text-slate-200 font-medium">
                {webglData?.hardwareHash ? `${webglData.hardwareHash.slice(0, 10)}...` : t.common.na}
              </span>
            </div>

            {/* Audio Hash */}
            <div className="flex items-center justify-between p-2 bg-slate-900/50 border border-slate-800/80 rounded-lg font-mono">
              <span className="text-slate-400 text-[11px]">{t.browser.audioSignature}:</span>
              <span className="text-slate-200 font-medium">
                {audioData?.hash ? `${audioData.hash.slice(0, 10)}...` : t.common.na}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
