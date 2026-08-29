/**
 * ProblemDetailModal Component
 * Full-fidelity diagnostic review modal for individual browser signal problems.
 */

import React, { useEffect } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { BrowserProblem, RemediationType, SignalStatus } from '../utils/problemExtractor';
import {
  X,
  AlertTriangle,
  AlertOctagon,
  Info,
  ShieldCheck,
  RotateCw,
  Sliders,
  User,
  Monitor,
  Globe,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

interface ProblemDetailModalProps {
  problem: BrowserProblem | null;
  isOpen: boolean;
  onClose: () => void;
  onRecheck: (problemId: string) => Promise<void>;
  isRechecking: boolean;
}

export const ProblemDetailModal: React.FC<ProblemDetailModalProps> = ({
  problem,
  isOpen,
  onClose,
  onRecheck,
  isRechecking,
}) => {
  const { t } = useLanguage();

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !problem) return null;

  const getRemediationBadge = (type: RemediationType) => {
    switch (type) {
      case 'DIRECT_USER_ACTION':
        return {
          icon: <User className="w-3.5 h-3.5 mr-1" />,
          label: t.browser.remediationDirectUser,
          classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        };
      case 'BROWSER_SETTING':
        return {
          icon: <Sliders className="w-3.5 h-3.5 mr-1" />,
          label: t.browser.remediationBrowserSetting,
          classes: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        };
      case 'SYSTEM_SETTING':
        return {
          icon: <Monitor className="w-3.5 h-3.5 mr-1" />,
          label: t.browser.remediationSystemSetting,
          classes: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        };
      case 'WEBSITE_ADMIN_CONFIG':
        return {
          icon: <Globe className="w-3.5 h-3.5 mr-1" />,
          label: t.browser.remediationAdminConfig,
          classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        };
      case 'NETWORK_PROVIDER_CONFIG':
        return {
          icon: <Globe className="w-3.5 h-3.5 mr-1" />,
          label: t.browser.remediationNetworkConfig,
          classes: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        };
      case 'EDUCATIONAL_ONLY':
        return {
          icon: <HelpCircle className="w-3.5 h-3.5 mr-1" />,
          label: t.browser.remediationEducational,
          classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        };
      default:
        return {
          icon: <Info className="w-3.5 h-3.5 mr-1" />,
          label: t.browser.remediationNotActionable,
          classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        };
    }
  };

  const getStatusLabel = (status: SignalStatus) => {
    switch (status) {
      case 'DETECTED':
        return t.browser.statusDetected;
      case 'NOT_DETECTED':
        return t.browser.statusNotDetected;
      case 'PROTECTED':
        return t.browser.statusProtected;
      case 'SUSPECTED':
        return t.browser.statusSuspected;
      case 'UNAVAILABLE':
        return t.browser.statusUnavailable;
      case 'BLOCKED':
        return t.browser.statusBlocked;
      case 'FAILED':
        return t.browser.statusFailed;
      case 'TIMEOUT':
        return t.browser.statusTimeout;
      default:
        return t.browser.statusUnknown;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'HIGH':
        return { label: t.browser.confidenceHigh, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'MEDIUM':
        return { label: t.browser.confidenceMedium, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      case 'LOW':
        return { label: t.browser.confidenceLow, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
      default:
        return { label: t.browser.confidenceUnknown, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
    }
  };

  const remediation = getRemediationBadge(problem.remediationType);
  const confidenceBadge = getConfidenceBadge(problem.confidence);

  return (
    <div
      id="problem-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-problem-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 my-8 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              {problem.severity === 'critical' ? (
                <AlertOctagon className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {problem.severity}
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                  {getStatusLabel(problem.status)}
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wider text-rose-400 font-mono">
                  {problem.points} pts
                </span>
              </div>
              <h2 id="modal-problem-title" className="text-xl font-bold text-slate-100">
                {problem.signalName}
              </h2>
            </div>
          </div>
          <button
            id="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-4 text-sm max-h-[70vh] overflow-y-auto pr-1">
          {/* Metadata Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${remediation.classes}`}>
              {remediation.icon}
              <span>{remediation.label}</span>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${confidenceBadge.color}`}>
              {confidenceBadge.label}
            </div>
          </div>

          {/* Section 1: What We Found */}
          <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              1. {t.browser.whatWeFound}
            </h3>
            <p className="text-slate-200 leading-relaxed">{problem.whatWeFound}</p>
          </div>

          {/* Section 2: Why It Matters */}
          <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 mb-1.5">
              2. {t.browser.whyItMatters}
            </h3>
            <p className="text-slate-300 leading-relaxed">{problem.whyItMatters}</p>
          </div>

          {/* Section 3: Evidence & Runtime Data */}
          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5">
              3. {t.browser.evidenceTitle}
            </h3>
            <div className="font-mono text-xs text-cyan-300/90 bg-slate-900/90 p-2.5 rounded border border-slate-800 break-all select-all">
              {problem.evidence}
            </div>
          </div>

          {/* Section 4: How To Improve */}
          <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">
              4. {t.browser.howToImprove}
            </h3>
            <p className="text-slate-200 leading-relaxed">{problem.howToImprove}</p>
          </div>

          {/* Section 5: What Happens After Fixing */}
          <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              5. {t.browser.whatHappensAfterFix}
            </h3>
            <p className="text-emerald-300/90 leading-relaxed">{problem.whatHappensAfterFix}</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            id="modal-dismiss-btn"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            id="modal-recheck-btn"
            onClick={() => onRecheck(problem.id)}
            disabled={isRechecking}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
          >
            <RotateCw className={`w-4 h-4 ${isRechecking ? 'animate-spin' : ''}`} />
            {isRechecking ? t.browser.recheckingProblem : t.browser.recheckProblem}
          </button>
        </div>
      </div>
    </div>
  );
};
