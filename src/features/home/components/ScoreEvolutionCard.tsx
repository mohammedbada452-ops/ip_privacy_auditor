import React, { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  History,
  Trash2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Share2,
} from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { ScoreHistoryEntry } from '../types';
import { calculateScoreTrend } from '../utils/historyStorage';
import { buildShareReport, shareOrCopyReport } from '../utils/shareReport';
import { apiClient } from '@packages/api-client';
import type { PopulationInsightResponse } from '@packages/api-contract';

interface ScoreEvolutionCardProps {
  history: ScoreHistoryEntry[];
  onClearHistory: () => void;
  latestAnalysis?: import('@packages/api-contract').PrivacyScoreAnalysis | null;
  risks?: import('../types').UnifiedRiskItem[];
}

export const ScoreEvolutionCard: React.FC<ScoreEvolutionCardProps> = ({
  history,
  onClearHistory,
  latestAnalysis = null,
  risks = [],
}) => {
  const { t } = useLanguage();

  const trend = useMemo(() => calculateScoreTrend(history), [history]);
  const [population, setPopulation] = useState<PopulationInsightResponse | null>(null);

  useEffect(() => {
    let active = true;
    if (!latestAnalysis || latestAnalysis.verificationStatus === 'PARTIAL') {
      setPopulation(null);
      return () => { active = false; };
    }
    void apiClient.getPopulationInsight(latestAnalysis.privacyScore)
      .then((result) => { if (active) setPopulation(result); })
      .catch(() => { if (active) setPopulation(null); });
    return () => { active = false; };
  }, [latestAnalysis?.privacyScore, latestAnalysis?.verificationStatus]);

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div
      id="score-evolution-card"
      className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-100">
                {t.home.scoreEvolution.title}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                <Lock className="w-2.5 h-2.5" />
                {t.home.scoreEvolution.localOnlyBadge}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {t.home.scoreEvolution.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {latestAnalysis && (
            <button
              type="button"
              aria-label={t.ui.shareReport}
              onClick={() => void shareOrCopyReport(buildShareReport(latestAnalysis, risks, history))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 hover:border-cyan-400/40 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t.ui.shareReport}</span>
            </button>
          )}
          <button
          type="button"
          onClick={onClearHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 hover:text-rose-300 hover:border-rose-500/30 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{t.home.scoreEvolution.clearHistory}</span>
          </button>
        </div>
      </div>

      {/* Trend Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 block mb-1">
            {t.home.scoreEvolution.scanCount}
          </span>
          <span className="text-xl font-extrabold text-slate-100 font-mono">
            {trend.scanCount}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 block mb-1">
            {t.home.scoreEvolution.overallTrend}
          </span>
          <div className="flex items-center gap-1.5">
            {trend.overallDelta > 0 ? (
              <span className="text-xl font-extrabold text-emerald-400 font-mono flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +{trend.overallDelta}
              </span>
            ) : trend.overallDelta < 0 ? (
              <span className="text-xl font-extrabold text-rose-400 font-mono flex items-center gap-1">
                <TrendingDown className="w-4 h-4" />
                {trend.overallDelta}
              </span>
            ) : (
              <span className="text-xl font-extrabold text-slate-400 font-mono flex items-center gap-1">
                <Minus className="w-4 h-4" />
                0
              </span>
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 block mb-1">
            {t.home.scoreEvolution.averageScore}
          </span>
          <span className="text-xl font-extrabold text-emerald-400 font-mono">
            {trend.averageScore}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 block mb-1">
            Highest Score
          </span>
          <span className="text-xl font-extrabold text-amber-400 font-mono">
            {trend.highestScore}
          </span>
        </div>
      </div>

      {population?.status === 'READY' && population.scorePercentile !== null && (
        <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-cyan-300">{t.ui.anonymousPopulationComparison}</div>
              <div className="text-[11px] text-slate-400 mt-1">{t.ui.populationComparisonNote.replace('{sample}', population.sampleSize.toLocaleString()).replace('{days}', String(population.comparisonWindowDays))}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black font-mono text-cyan-300">{t.ui.outscoresPercentile.replace('{percent}', population.scorePercentile.toFixed(1))}</div>
              <div className="text-[10px] text-slate-500">{t.ui.higherScoreIsBetter}</div>
            </div>
          </div>
        </div>
      )}

      {/* History Timeline Logs with Detailed Fixed/Remaining Issues */}
      <div className="space-y-3 pt-2">
        <span className="text-xs font-bold text-slate-400 block mb-1">
          Recent Audit Evolution ({history.length})
        </span>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {history.slice(0, 10).map((entry) => {
            const dateStr = new Date(entry.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={entry.id}
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {entry.label}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {dateStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.previousScore !== undefined ? (
                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <span className="text-slate-400">{entry.previousScore}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="text-cyan-300 font-bold">{entry.score}</span>
                        {entry.scoreDelta !== undefined && entry.scoreDelta !== 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              entry.scoreDelta > 0
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {entry.scoreDelta > 0 ? `+${entry.scoreDelta}` : entry.scoreDelta} pts
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        {entry.score}/100
                      </span>
                    )}
                  </div>
                </div>

                {/* Fixed issues if any */}
                {entry.fixedIssues && entry.fixedIssues.length > 0 && (
                  <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-[11px] space-y-1">
                    <div className="text-emerald-400 font-bold font-mono flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{t.ui.fixedIssues.replace('{count}', String(entry.fixedIssues.length))}:</span>
                    </div>
                    <ul className="list-disc list-inside text-emerald-300/90 space-y-0.5 pl-1">
                      {entry.fixedIssues.map((fixed, idx) => (
                        <li key={idx} className="truncate">
                          {fixed}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Remaining issues if any */}
                {entry.remainingIssues && entry.remainingIssues.length > 0 && (
                  <div className="text-[11px] font-sans text-slate-400 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      Remaining:
                    </span>
                    {entry.remainingIssues.slice(0, 3).map((rem, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 text-[10px] truncate max-w-[200px]"
                      >
                        {rem}
                      </span>
                    ))}
                    {entry.remainingIssues.length > 3 && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        +{entry.remainingIssues.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
