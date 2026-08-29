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
      <FreeToolsSection />

      {/* Dynamic Scan Progress Indicator */}
      <ScanProgressBar steps={steps} isScanning={isScanning || isRechecking} />

      {/* If initial scan is in progress and we have no analysis yet */}
      {isScanning && !privacyAnalysis ? (
        <InitialScanningHero steps={steps} />
      ) : privacyAnalysis ? (
        <>
          {/* Hero Section with ScoreGauge & Primary Action */}
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

          {/* Unified Risk Overview ("Your Privacy Exposure") */}
          <UnifiedRiskOverview
            summary={riskSummary}
            activeFilter={activeSeverityFilter}
            onFilterChange={(filter) => {
              setActiveSeverityFilter(filter);
              scrollToProblemCenter();
            }}
            onViewAllClick={scrollToProblemCenter}
          />

          {/* Security Analysis Timeline (Multi-stage pipeline telemetry) */}
          <SecurityAnalysisTimeline
            stages={timelineStages}
            totalDurationMs={timingMetrics.totalDurationMs}
          />

          {/* Smart Recommendations Engine */}
          <SmartRecommendationsSection recommendations={recommendations} />

          {/* Privacy Remediation Center (FIX 6 Actionable Guidance Engine) */}
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

          {/* Unified Problem Center (Cross-vector consolidated issues) */}
          <UnifiedProblemCenter
            risks={unifiedRisks}
            activeSeverityFilter={activeSeverityFilter}
            onSeverityFilterChange={setActiveSeverityFilter}
          />

          {/* Score Evolution History (localStorage-backed) */}
          <ScoreEvolutionCard history={history} onClearHistory={clearHistory} latestAnalysis={privacyAnalysis} risks={unifiedRisks} />

          {/* Deductions Breakdown */}
          <WhyNotHigherSection
            factors={privacyAnalysis.factors}
            privacyScore={privacyAnalysis.privacyScore}
            onSelectFactorForRemediation={(factor) => setSelectedFactorForRemediation(factor)}
          />

          {/* Active Protections */}
          <ActiveProtectionsSection factors={privacyAnalysis.factors} />

          {/* Quick Technical Intelligence Overview */}
          <TechnicalSummarySection
            ipCheck={ipCheck}
            ipDetails={ipDetails}
            browserProfile={browserProfile}
            headersData={headersData}
          />
        </>
      ) : null}

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
