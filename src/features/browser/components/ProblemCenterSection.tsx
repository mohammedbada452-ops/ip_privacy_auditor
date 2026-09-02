/**
 * ProblemCenterSection Component
 * Dedicated Problem Center displaying active browser exposures, entropy vectors, and remediation actions.
 */

import React, { useState } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { BrowserProblem, RemediationType, SignalStatus } from '../utils/problemExtractor';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RotateCw,
  ShieldCheck,
  Info,
  Sliders,
  User,
  Monitor,
  Globe,
  HelpCircle,
} from 'lucide-react';

interface ProblemCenterSectionProps {
  problems: BrowserProblem[];
  onOpenProblem: (problem: BrowserProblem) => void;
  onRecheck: (problemId: string) => Promise<void>;
  isRechecking: boolean;
  onJumpToSignal?: (sectionId: string) => void;
}

export const ProblemCenterSection: React.FC<ProblemCenterSectionProps> = ({
  problems,
  onOpenProblem,
  onRecheck,
  isRechecking,
  onJumpToSignal,
}) => {
  const { t } = useLanguage();
  const [recheckingId, setRecheckingId] = useState<string | null>(null);

  const handleRecheck = async (e: React.MouseEvent, problemId: string) => {
    e.stopPropagation();
    setRecheckingId(problemId);
    try {
      await onRecheck(problemId);
    } finally {
      setRecheckingId(null);
    }
  };

  const getRemediationBadge = (type: RemediationType) => {
    switch (type) {
      case 'DIRECT_USER_ACTION':
        return {
          icon: <User className="w-3 h-3 mr-1" />,
          label: t.browser.remediationDirectUser,
          classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        };
      case 'BROWSER_SETTING':
        return {
          icon: <Sliders className="w-3 h-3 mr-1" />,
          label: t.browser.remediationBrowserSetting,
          classes: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        };
      case 'SYSTEM_SETTING':
        return {
          icon: <Monitor className="w-3 h-3 mr-1" />,
          label: t.browser.remediationSystemSetting,
          classes: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        };
      case 'WEBSITE_ADMIN_CONFIG':
        return {
          icon: <Globe className="w-3 h-3 mr-1" />,
          label: t.browser.remediationAdminConfig,
          classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        };
      case 'NETWORK_PROVIDER_CONFIG':
        return {
          icon: <Globe className="w-3 h-3 mr-1" />,
          label: t.browser.remediationNetworkConfig,
          classes: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        };
      case 'EDUCATIONAL_ONLY':
        return {
          icon: <HelpCircle className="w-3 h-3 mr-1" />,
          label: t.browser.remediationEducational,
          classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        };
      default:
        return {
          icon: <Info className="w-3 h-3 mr-1" />,
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

  return (
    <div
      id="problem-center"
      className="p-6 mb-8 rounded-xl bg-slate-900 border border-slate-800 shadow-xl scroll-mt-24 transition-all"
    >
      {/* Anchor for Exposures navigation */}
      <span id="browser-exposures" className="sr-only">{t.ui.browserExposuresAnchor}</span>

      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">{t.browser.problemCenterTitle}</h2>
              <span
                id="problem-center-badge"
                className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                  problems.length > 0
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {t.browser.activeIssuesCount.replace('{count}', String(problems.length))}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{t.browser.problemCenterSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Clean State or List of Problems */}
      {problems.length === 0 ? (
        <div
          id="problem-center-clean"
          className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-center flex flex-col items-center justify-center"
        >
          <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-emerald-300">{t.browser.problemCenterCleanTitle}</h3>
          <p className="text-xs text-slate-400 max-w-md mt-1">{t.browser.problemCenterCleanDesc}</p>
        </div>
      ) : (
        <div className="space-y-3" id="problem-center-list">
          {problems.map((problem) => {
            const remBadge = getRemediationBadge(problem.remediationType);
            const isItemRechecking = isRechecking && recheckingId === problem.id;

            return (
              <div
                key={problem.id}
                id={`problem-card-${problem.id}`}
                onClick={() => onOpenProblem(problem)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenProblem(problem);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={problem.signalName}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wider ${
                        problem.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : problem.severity === 'high'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {problem.severity}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                      {getStatusLabel(problem.status)}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-mono font-bold text-rose-400">
                      {problem.points} pts
                    </span>
                    <div className={`flex items-center px-2 py-0.5 rounded-full text-xs border ${remBadge.classes}`}>
                      {remBadge.icon}
                      <span>{remBadge.label}</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">
                    {problem.signalName}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{problem.whatWeFound}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  {onJumpToSignal && problem.targetSectionId && (
                    <button
                      id={`jump-signal-${problem.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onJumpToSignal(problem.targetSectionId);
                      }}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-cyan-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-1"
                      title={t.common.viewDetails}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    id={`recheck-problem-${problem.id}`}
                    onClick={(e) => handleRecheck(e, problem.id)}
                    disabled={isRechecking}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isItemRechecking ? 'animate-spin' : ''}`} />
                    {isItemRechecking ? t.browser.recheckingProblem : t.browser.recheckProblem}
                  </button>

                  <button
                    id={`view-details-${problem.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProblem(problem);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg transition-colors"
                  >
                    {t.browser.viewProblemDetails}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
