import React, { useState } from 'react';
import { Card, Button, Badge } from '../../../components/ui';
import { X, Download, Copy, Check, FileJson, FileText, Sparkles } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { BrowserProfile } from '../types';

export interface BrowserExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: BrowserProfile;
}

export const BrowserExportModal: React.FC<BrowserExportModalProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'JSON' | 'RAW'>('JSON');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const jsonExport = JSON.stringify(profile, null, 2);

  const rawTextExport = [
    '========================================================',
    'BROWSER INTELLIGENCE & ENVIRONMENTAL FINGERPRINT AUDIT',
    '========================================================',
    `${t.common.lastScanTimestamp}: ${new Date(profile.timestamp).toISOString()}`,
    `${t.browser.totalSignals}: ${profile.summary.totalSignalsEvaluated}`,
    `${t.browser.confirmedFingerprintExposures}: ${profile.summary.exposedHardwareSignals}`,
    `${t.browser.privacyProtections}: ${profile.summary.privacyProtectionsActive}`,
    '',
    '--- COMPOSITE IDENTIFIERS ---',
    `Canvas Hash: ${(profile.groups.GRAPHICS?.data as any)?.hash || 'N/A'}`,
    `WebGL Hardware Hash: ${(profile.groups.GRAPHICS?.data as any)?.hardwareHash || 'N/A'}`,
    `Audio Status: ${(profile.groups.AUDIO?.data as any)?.status || (profile.groups.AUDIO?.data as any)?.audioStatus || 'UNAVAILABLE'}`,
    `Audio Hash: ${(profile.groups.AUDIO?.data as any)?.hash || 'N/A'}`,
    '',
    '--- GRAPHICS & CANVAS ---',
    `Canvas Hash: ${(profile.groups.GRAPHICS?.data as any)?.hash || 'N/A'}`,
    `Canvas Stability: ${(profile.groups.GRAPHICS?.data as any)?.isRandomized === true ? 'Randomized' : (profile.groups.GRAPHICS?.data as any)?.isRandomized === false ? 'Stable observed' : 'Not measured'}`,
    `WebGL Status: ${(profile.groups.GRAPHICS?.data as any)?.webglStatus || 'UNAVAILABLE'}`,
    `WebGL Unmasked Renderer: ${(profile.groups.GRAPHICS?.data as any)?.unmaskedRenderer || 'N/A'}`,
    `WebGL Unmasked Vendor: ${(profile.groups.GRAPHICS?.data as any)?.unmaskedVendor || 'N/A'}`,
    `WebGL Hardware Hash: ${(profile.groups.GRAPHICS?.data as any)?.hardwareHash || 'N/A'}`,
    '',
    '--- WEBRTC & NETWORK LEAKS ---',
    `Private IP Leak: ${(profile.groups.WEBRTC?.data as any)?.status === 'LEAK_DETECTED' && (profile.groups.WEBRTC?.data as any)?.leakDetected === true ? 'YES' : (profile.groups.WEBRTC?.data as any)?.status && !['UNAVAILABLE', 'ERROR', 'TIMEOUT', 'BLOCKED'].includes((profile.groups.WEBRTC?.data as any)?.status) ? 'NO CONFIRMED LEAK' : 'NOT MEASURED'}`,
    `WebRTC Status: ${(profile.groups.WEBRTC?.data as any)?.status || 'UNAVAILABLE'}`, 
    `Local IPs: ${((profile.groups.WEBRTC?.data as any)?.localIps || []).join(', ') || 'None'}`,
    `Public Candidates: ${((profile.groups.WEBRTC?.data as any)?.publicIps || []).join(', ') || 'None'}`,
    '',
    '--- HARDWARE & SCREEN ---',
    `CPU Cores: ${(profile.groups.HARDWARE?.data as any)?.cpuCores || 'N/A'}`,
    `Device Memory: ${(profile.groups.HARDWARE?.data as any)?.deviceMemory || 'N/A'} GB`,
    `Screen: ${((profile.groups.DISPLAY?.data as any)?.width != null && (profile.groups.DISPLAY?.data as any)?.height != null) ? `${(profile.groups.DISPLAY?.data as any).width}x${(profile.groups.DISPLAY?.data as any).height}` : 'Not measured'} (${(profile.groups.DISPLAY?.data as any)?.colorDepth != null ? `${(profile.groups.DISPLAY?.data as any).colorDepth}-bit` : 'color depth not measured'})`,
    `DPR: ${(profile.groups.DISPLAY?.data as any)?.devicePixelRatio != null ? `${(profile.groups.DISPLAY?.data as any).devicePixelRatio}x` : 'Not measured'}`,
    '',
    '--- AUTOMATION & BOT MARKERS ---',
    `Automation Detected: ${(profile.groups.AUTOMATION?.data as any)?.isAutomation === true ? 'YES' : (profile.groups.AUTOMATION?.data as any)?.isAutomation === false ? 'NO' : 'NOT MEASURED'}`,
    `WebDriver Active: ${(profile.groups.AUTOMATION?.data as any)?.isWebDriver === true ? 'YES' : (profile.groups.AUTOMATION?.data as any)?.isWebDriver === false ? 'NO' : 'NOT MEASURED'}`,
    '',
    '--- PRIVACY PROTECTIONS ---',
    `${t.browser.gpcSignal}: ${(profile.groups.PRIVACY_PROTECTIONS?.data as any)?.globalPrivacyControl === true ? t.common.active : (profile.groups.PRIVACY_PROTECTIONS?.data as any)?.globalPrivacyControl === false ? t.common.inactive : t.ui.notMeasured}`,
    `${t.browser.dntSignal}: ${(profile.groups.PRIVACY_PROTECTIONS?.data as any)?.doNotTrack === true ? t.common.active : (profile.groups.PRIVACY_PROTECTIONS?.data as any)?.doNotTrack === false ? t.common.inactive : t.ui.notMeasured}`,
    '========================================================',
  ].join('\n');

  const contentToDisplay = activeTab === 'JSON' ? jsonExport : rawTextExport;

  const handleCopy = () => {
    navigator.clipboard.writeText(contentToDisplay);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extension = activeTab === 'JSON' ? 'json' : 'txt';
    const mimeType = activeTab === 'JSON' ? 'application/json' : 'text/plain';
    const blob = new Blob([contentToDisplay], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `browser-intelligence-audit-${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <Card
        variant="standard"
        className="w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl border-slate-700 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">{t.browser.exportTitle}</h2>
              <p className="text-xs text-slate-400">{t.browser.exportSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-800/60 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('JSON')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'JSON'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileJson className="w-4 h-4" />
              <span>{t.browser.exportJsonTab}</span>
            </button>
            <button
              onClick={() => setActiveTab('RAW')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'RAW'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{t.browser.exportRawTab}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            {activeTab === 'JSON' ? 'application/json' : 'text/plain'}
          </div>
        </div>

        {/* Code Content Body */}
        <div className="flex-1 p-5 overflow-y-auto bg-slate-950/80 font-mono text-xs text-slate-300 leading-relaxed select-all">
          <pre className="whitespace-pre-wrap break-all">{contentToDisplay}</pre>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-800 bg-slate-900/60">
          <span className="text-[11px] text-slate-400 leading-tight">
            {t.browser.exportNote}
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              leftIcon={
                copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )
              }
            >
              {copied ? t.common.copied : t.browser.exportCopy}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownload}
              leftIcon={<Download className="w-4 h-4" />}
            >
              {t.browser.exportDownload}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
