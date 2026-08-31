import React, { useEffect } from 'react';
import { X, ShieldAlert, CheckCircle2, RotateCcw, ExternalLink } from 'lucide-react';
import { SeverityBadge } from '../../../components/status/SeverityBadge';
import { Link } from '../../../router/Router';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { PrivacyFactor } from '@packages/api-contract';

interface RemediationModalProps {
  factor: PrivacyFactor | null;
  isOpen: boolean;
  onClose: () => void;
  onRecheck: () => void;
}

export const RemediationModal: React.FC<RemediationModalProps> = ({
  factor,
  isOpen,
  onClose,
  onRecheck,
}) => {
  const { t } = useLanguage();

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !factor) return null;

  // Determine specific guidance content based on factor id or category
  const getActionGuidance = (factorId: string) => {
    switch (factorId) {
      case 'canvas_fingerprint':
        return {
          steps: [
            'Enable Firefox Resist Fingerprinting: Type about:config and set privacy.resistFingerprinting to true.',
            'Use Brave Browser with "Strict" fingerprinting protection enabled in Brave Shields.',
            'Install privacy extensions such as CanvasBlocker or Privacy Badger to inject canvas noise.',
          ],
          deepDiveRoute: '/browser',
          deepDiveLabel: 'Inspect Canvas Fingerprint in Browser Intelligence',
        };
      case 'webgl_hardware':
        return {
          steps: [
            'Disable unmasked WebGL vendor strings in Firefox via webgl.disabled or privacy.resistFingerprinting.',
            'In Chromium-based browsers, consider launching with --disable-reading-from-canvas or using Tor Browser.',
            'Note: Masking WebGL may reduce visual fidelity in 3D browser games or WebGL applications.',
          ],
          deepDiveRoute: '/browser',
          deepDiveLabel: 'Inspect WebGL Parameters in Browser Intelligence',
        };
      case 'webrtc_leak':
        return {
          steps: [
            'In Firefox, set media.peerconnection.enabled to false in about:config.',
            'In Chrome, install WebRTC Leak Prevent or set WebRTC policy to default_public_interface_only.',
            'Use a VPN client that operates at the OS network interface level rather than a browser extension proxy.',
          ],
          deepDiveRoute: '/browser',
          deepDiveLabel: 'Inspect WebRTC Candidates in Browser Intelligence',
        };
      case 'sec_gpc_missing':
      case 'dnt_missing': {
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const isFirefox = /Firefox|FxiOS/i.test(ua);
        const isBrave = /Brave/i.test(ua);
        const isChromeFamily = /Chrome|CriOS|Edg\//i.test(ua) && !/Firefox|FxiOS/i.test(ua);
        const gpcNotSupported = isChromeFamily && !isBrave && !isFirefox;
        return {
          steps: gpcNotSupported
            ? [
                t.browser.gpcNotSupported,
                t.browser.gpcUseExtension,
                t.browser.gpcRecheck,
              ]
            : isFirefox
              ? [
                  'Open Firefox Settings → Privacy & Security and enable the available Global Privacy Control preference.',
                  'Confirm the browser is configured to send the GPC signal.',
                  t.browser.gpcRecheck,
                ]
              : isBrave
                ? [
                    'Open Brave Shields settings and enable Global Privacy Control.',
                    'Confirm the browser is configured to send Sec-GPC: 1.',
                    t.browser.gpcRecheck,
                  ]
                : [
                    t.browser.gpcNotSupported,
                    t.browser.gpcUseExtension,
                    t.browser.gpcRecheck,
                  ],
          deepDiveRoute: '/headers',
          deepDiveLabel: 'Inspect HTTP Privacy Headers',
        };
      }
      case 'proxy_detected':
      case 'vpn_detected':
      case 'tor_detected':
        return {
          steps: [
            'This factor indicates traffic is routed through a public datacenter or VPN exit node.',
            'If you intentionally use a VPN/Tor, your location is protected, but datacenter IP classifications may trigger strict verification on some sites.',
            'To return to standard residential routing, disconnect the active VPN or proxy client.',
          ],
          deepDiveRoute: '/',
          deepDiveLabel: 'Review IP Network Classification',
        };
      default:
        return {
          steps: [
            'Review browser privacy settings and consider blocking third-party cookies and trackers.',
            'Keep your browser updated to the latest stable release to benefit from built-in anti-tracking mitigations.',
          ],
          deepDiveRoute: factor.category === 'HEADERS' ? '/headers' : '/browser',
          deepDiveLabel: 'View Detailed Signals',
        };
    }
  };

  const guidance = getActionGuidance(factor.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remediation-modal-title"
    >
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl p-6 sm:p-7 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h2 id="remediation-modal-title" className="text-lg font-mono font-bold text-slate-100">
                {t.home.remediationModal.title}
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              {factor.name}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
            aria-label={t.home.remediationModal.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm font-sans pr-1">
          {/* Status & Impact card */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SeverityBadge severity={factor.severity} size="sm" />
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300">
                {factor.category}
              </span>
            </div>
            <div className="font-mono font-bold text-red-400">
              -{factor.points} {t.common.pts} {t.common.impact}
            </div>
          </div>

          {/* Root Cause / Technical Explanation */}
          <div>
            <h3 className="text-xs font-mono uppercase font-semibold text-slate-400 mb-1">
              {t.home.remediationModal.technicalExplanation}
            </h3>
            <p className="text-slate-300 leading-relaxed text-xs bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
              {factor.reason || factor.description}
            </p>
          </div>

          {/* Actionable Guidance Steps */}
          <div>
            <h3 className="text-xs font-mono uppercase font-semibold text-cyan-400 mb-2">
              {t.home.remediationModal.browserGuidance}
            </h3>
            <ul className="space-y-2">
              {guidance.steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Deep dive link */}
          {guidance.deepDiveRoute && (
            <div className="pt-2">
              <Link
                to={guidance.deepDiveRoute}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline"
              >
                <span>{guidance.deepDiveLabel}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-all"
          >
            {t.home.remediationModal.close}
          </button>

          <button
            onClick={() => {
              onClose();
              onRecheck();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-mono font-semibold transition-all shadow-md shadow-cyan-900/20"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.home.remediationModal.recheckNow}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
