import React, { useState } from 'react';
import { useHomepagePrivacyScan } from './hooks/useHomepagePrivacyScan';
import { ScanProgressBar } from './components/ScanProgressBar';
import { PrivacyScoreHero } from './components/PrivacyScoreHero';
import { SecurityAnalysisTimeline } from './components/SecurityAnalysisTimeline';
import { UnifiedRiskOverview } from './components/UnifiedRiskOverview';
import { UnifiedProblemCenter } from './components/UnifiedProblemCenter';
import { SmartRecommendationsSection } from './components/SmartRecommendationsSection';
import { FreeToolsSection } from './components/FreeToolsSection';
import { PrivacyRemediationCenter } from './components/PrivacyRemediationCenter';
import { ScoreEvolutionCard } from './components/ScoreEvolutionCard';
import { InitialScanningHero } from './components/InitialScanningHero';
import { WhyNotHigherSection } from './components/WhyNotHigherSection';
import { ActiveProtectionsSection } from './components/ActiveProtectionsSection';
import { TechnicalSummarySection } from './components/TechnicalSummarySection';
import { RemediationModal } from './components/RemediationModal';
import { ErrorState } from '../../components/feedback/ErrorState';
import { useLanguage } from '../../i18n/LanguageContext';
import type { PrivacyFactor } from '@packages/api-contract';
import type { RiskSeverity } from './types';

export const HomepagePrivacyAuditor: React.FC = () => {
  const { t } = useLanguage();
  const {
    privacyAnalysis,
    ipCheck,
    ipDetails,
    networkIntelligence,
    browserProfile,
    headersData,
    steps,
    stage,
    isScanning,
    isRechecking,
    scoreDelta,
    isPartial,
    partialReason,
    error,
    timingMetrics,
    timelineStages,
    unifiedRisks,
    riskSummary,
    recommendations,
    remediationFindings,
    remediationSummary,
    consistencyObservations,
    previousScore,
    history,
    recheck,
    clearHistory,
  } = useHomepagePrivacyScan();

  const [selectedFactorForRemediation, setSelectedFactorForRemediation] = useState<PrivacyFactor | null>(null);
  const [activeSeverityFilter, setActiveSeverityFilter] = useState<RiskSeverity | null>(null);

  const scrollToProblemCenter = () => {
    const el = document.getElementById('problem-center-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Complete failure state with zero analysis data
  if (stage === 'ERROR' && !privacyAnalysis) {
    return (
      <div className="py-8">
        <ErrorState
          title={t.common.error}
          message={error || t.ip.errorMessage}
          onRetry={recheck}
        />
      </div>
    );
  }

  return (
    <div className="w-full py-4 sm:py-6 space-y-8 animate-fadeIn">
      {/* Visitor-first hero: during the initial scan, show progress immediately; once available, lead with the score. */}
      <ScanProgressBar steps={steps} isScanning={isScanning || isRechecking} />

      {isScanning && !privacyAnalysis ? (
        <InitialScanningHero steps={steps} />
      ) : privacyAnalysis ? (
        <>
          {/* Primary product value: make the privacy result the first substantive content. */}
          <PrivacyScoreHero
            analysis={privacyAnalysis}
            isScanning={isScanning}
            isRechecking={isRechecking}
            scoreDelta={scoreDelta}
            isPartial={isPartial}
            partialReason={partialReason}
            totalDurationMs={timingMetrics.totalDurationMs}
            onRecheck={recheck}
          />

          {/* The highest-priority findings should follow the score immediately. */}
          <UnifiedRiskOverview
            summary={riskSummary}
            activeFilter={activeSeverityFilter}
            onFilterChange={(filter) => {
              setActiveSeverityFilter(filter);
              scrollToProblemCenter();
            }}
            onViewAllClick={scrollToProblemCenter}
          />

          {/* Technical evidence that explains the score and risk summary. */}
          <TechnicalSummarySection
            ipCheck={ipCheck}
            ipDetails={ipDetails}
            networkIntelligence={networkIntelligence}
            browserProfile={browserProfile}
            headersData={headersData}
            onRefresh={recheck}
            isRefreshing={isRechecking}
          />

          <SecurityAnalysisTimeline
            stages={timelineStages}
            totalDurationMs={timingMetrics.totalDurationMs}
          />

          <UnifiedProblemCenter
            risks={unifiedRisks}
            activeSeverityFilter={activeSeverityFilter}
            onSeverityFilterChange={setActiveSeverityFilter}
          />

          <SmartRecommendationsSection recommendations={recommendations} />

          <PrivacyRemediationCenter
            findings={remediationFindings}
            summary={remediationSummary}
            consistencyObservations={consistencyObservations}
            currentScore={privacyAnalysis.privacyScore}
            previousScore={previousScore}
            scoreDelta={scoreDelta}
            isRechecking={isRechecking}
            onRecheck={recheck}
          />

          <WhyNotHigherSection
            factors={privacyAnalysis.factors}
            privacyScore={privacyAnalysis.privacyScore}
            onSelectFactorForRemediation={(factor) => setSelectedFactorForRemediation(factor)}
          />

          <ActiveProtectionsSection factors={privacyAnalysis.factors} />

          <ScoreEvolutionCard
            history={history}
            onClearHistory={clearHistory}
            latestAnalysis={privacyAnalysis}
            risks={unifiedRisks}
          />

          {/* Secondary discovery: specialist views remain available without competing with the score. */}
          <FreeToolsSection />
        </>
      ) : (
        <TechnicalSummarySection
          ipCheck={ipCheck}
          ipDetails={ipDetails}
          networkIntelligence={networkIntelligence}
          browserProfile={browserProfile}
          headersData={headersData}
          onRefresh={recheck}
          isRefreshing={isRechecking}
        />
      )}

      {/* Remediation Guidance Modal */}
      <RemediationModal
        factor={selectedFactorForRemediation}
        isOpen={selectedFactorForRemediation !== null}
        onClose={() => setSelectedFactorForRemediation(null)}
        onRecheck={recheck}
      />
    </div>
  );
};
