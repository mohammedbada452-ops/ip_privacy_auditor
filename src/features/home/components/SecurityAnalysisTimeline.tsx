import React, { useState } from 'react';
import {
  Activity,
  Globe,
  Monitor,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { TimelineStageItem } from '../types';

interface SecurityAnalysisTimelineProps {
  stages: TimelineStageItem[];
  totalDurationMs?: number;
}

export const SecurityAnalysisTimeline: React.FC<SecurityAnalysisTimelineProps> = ({
  stages,
  totalDurationMs,
}) => {
  const { t } = useLanguage();
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const toggleStage = (id: string) => {
    setExpandedStage((prev) => (prev === id ? null : id));
  };

  const getStageIcon = (id: string) => {
    switch (id) {
      case 'network':
        return <Globe className="w-5 h-5" />;
      case 'browser':
        return <Monitor className="w-5 h-5" />;
      case 'headers':
        return <FileCode className="w-5 h-5" />;
      case 'scoring':
        return <ShieldCheck className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status: TimelineStageItem['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            {t.home.timeline.statusCompleted}
          </span>
        );
      case 'issue_found':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            {t.home.timeline.statusIssueFound}
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            {t.home.timeline.statusWarning}
          </span>
        );
      case 'unavailable':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <HelpCircle className="w-3 h-3" />
            {t.home.timeline.statusUnavailable}
          </span>
        );
      default:
        return null;
    }
  };

  const getStageTitle = (titleKey: string) => {
    if (titleKey === 'home.timeline.networkStageTitle') return t.home.timeline.networkStageTitle;
    if (titleKey === 'home.timeline.browserStageTitle') return t.home.timeline.browserStageTitle;
    if (titleKey === 'home.timeline.headersStageTitle') return t.home.timeline.headersStageTitle;
    if (titleKey === 'home.timeline.scoringStageTitle') return t.home.timeline.scoringStageTitle;
    return titleKey;
  };

  return (
    <div
      id="security-analysis-timeline"
      className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100">
              {t.home.timeline.sectionTitle}
            </h2>
            <p className="text-xs text-slate-400">
              {t.home.timeline.sectionSubtitle}
            </p>
          </div>
        </div>

        {totalDurationMs !== undefined && totalDurationMs > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-400 self-start sm:self-auto">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>{t.home.timeline.durationLabel}: {totalDurationMs}ms</span>
          </div>
        )}
      </div>

      {/* Pipeline Stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage) => {
          const isExpanded = expandedStage === stage.id;
          return (
            <div
              key={stage.id}
              className={`rounded-2xl border transition-all ${
                stage.status === 'issue_found' || stage.status === 'warning'
                  ? 'bg-amber-950/10 border-amber-500/20 hover:border-amber-500/40'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
              } p-4 flex flex-col justify-between`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300">
                    {getStageIcon(stage.id)}
                  </div>
                  {getStatusBadge(stage.status)}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    {getStageTitle(stage.titleKey)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                    {stage.summary}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>{stage.durationMs}ms</span>
                <button
                  type="button"
                  onClick={() => toggleStage(stage.id)}
                  className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                >
                  <span>{isExpanded ? 'Hide details' : 'Telemetry'}</span>
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Collapsible telemetry details */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-1.5 text-slate-300 animate-fadeIn">
                  {stage.details.map((detail, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
