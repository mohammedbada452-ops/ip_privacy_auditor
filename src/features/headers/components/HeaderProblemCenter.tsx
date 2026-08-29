import React from 'react';
import { AlertTriangle, CheckCircle, Info, Wrench } from 'lucide-react';
import { Card, CardBody, Badge } from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { HeaderProblem, HeaderRemediationActor } from '../types';

export interface HeaderProblemCenterProps {
  problems: HeaderProblem[];
  onSelectHeader?: (headerName: string) => void;
}

export const HeaderProblemCenter: React.FC<HeaderProblemCenterProps> = ({
  problems,
  onSelectHeader,
}) => {
  const { t, formatNumber } = useLanguage();

  const getActorLabel = (actor: HeaderRemediationActor): string => {
    switch (actor) {
      case 'DIRECT USER ACTION':
        return t.browser?.remediationDirectUser || 'Direct User Action';
      case 'BROWSER SETTING':
        return t.browser?.remediationBrowserSetting || 'Browser Setting';
      case 'SYSTEM SETTING':
        return t.browser?.remediationSystemSetting || 'System Setting';
      case 'WEBSITE/ADMIN CONFIGURATION':
        return t.browser?.remediationAdminConfig || 'Server/Admin Configuration';
      case 'NETWORK/PROVIDER CONFIGURATION':
        return t.browser?.remediationNetworkConfig || 'Network/ISP Configuration';
      case 'EDUCATIONAL ONLY':
        return t.browser?.remediationEducational || 'Educational Context';
      default:
        return t.browser?.remediationNotActionable || 'Not Actionable';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return (
          <Badge variant="danger" size="sm" className="font-semibold uppercase tracking-wider">
            {t.headers.badgeDanger}
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="warning" size="sm" className="font-semibold uppercase tracking-wider">
            {t.headers.badgeWarning}
          </Badge>
        );
      case 'low':
      default:
        return (
          <Badge variant="info" size="sm" className="font-semibold uppercase tracking-wider">
            {t.headers.badgeInfo}
          </Badge>
        );
    }
  };

  if (!problems || problems.length === 0) {
    return (
      <div id="problem-center-section" className="scroll-mt-6">
        <Card variant="standard" className="border-emerald-800/40 bg-emerald-950/10 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-slate-100">
                  {t.headers.problemCenterTitle}
                </h3>
                <Badge variant="success" size="sm">
                  {t.headers.clean}
                </Badge>
              </div>
              <p className="text-sm text-slate-300 mt-1 font-medium">
                {t.headers.noProblemsFound}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.headers.noProblemsFoundSubtitle}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div id="problem-center-section" className="scroll-mt-6 space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>{t.headers.problemCenterTitle}</span>
              <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/50">
                {formatNumber(problems.length)} {t.headers.observations}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {t.headers.problemCenterSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Problems Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {problems.map((problem) => (
          <Card
            key={problem.id}
            variant="standard"
            className="border-slate-800/90 bg-slate-900/80 hover:border-slate-700/90 transition-colors duration-150 overflow-hidden flex flex-col justify-between"
          >
            <CardBody className="p-5 space-y-3.5">
              {/* Problem Title & Severity */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(problem.severity)}
                    <button
                      type="button"
                      onClick={() => onSelectHeader && onSelectHeader(problem.headerName)}
                      className="text-[11px] font-mono font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/40 px-2 py-0.5 rounded transition-colors"
                    >
                      {problem.headerName}
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 pt-0.5">
                    {problem.title}
                  </h4>
                </div>
                {problem.potentialScoreImpact > 0 && (
                  <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/60 border border-rose-800/40 px-2 py-1 rounded shrink-0">
                    -{formatNumber(problem.potentialScoreImpact)} {t.privacy.pointsDeduction}
                  </span>
                )}
              </div>

              {/* Why It Matters */}
              <div className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-3 space-y-1 text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  {t.headers.problemWhyItMatters}
                </span>
                <p className="text-slate-400 leading-relaxed">
                  {problem.whyItMatters}
                </p>
              </div>

              {/* Evidence Snippet */}
              <div className="bg-slate-950/70 border border-slate-800/70 rounded-lg p-2.5">
                <span className="text-[11px] font-mono text-slate-500 block mb-1">
                  {t.headers.problemEvidence}:
                </span>
                <code className="text-xs font-mono text-amber-300/90 break-all select-all block bg-slate-900/90 p-1.5 rounded border border-slate-800" dir="ltr">
                  {problem.evidence}
                </code>
              </div>

              {/* Remediation & Actor */}
              <div className="pt-1 border-t border-slate-800/70 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 font-medium">
                    {t.headers.problemActorLabel}:
                  </span>
                  <span className="text-[11px] font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
                    {getActorLabel(problem.remediationType)}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                    {t.headers.problemRemediation}:
                  </span>
                  <p className="text-slate-300 leading-relaxed bg-emerald-950/20 border border-emerald-800/30 rounded-lg p-2.5">
                    {problem.howToImprove}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
};
