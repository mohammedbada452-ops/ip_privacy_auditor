import React, { useState } from 'react';
import {
  Section,
  LoadingState,
  ErrorState,
  Skeleton,
  Card,
} from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import { useHeaderIntelligence } from '../hooks/useHeaderIntelligence';
import { HeaderOverviewCard } from './HeaderOverviewCard';
import { HeaderProblemCenter } from './HeaderProblemCenter';
import { HeaderClientHintsCard } from './HeaderClientHintsCard';
import { HeaderCookieSecurityCard } from './HeaderCookieSecurityCard';
import { HeaderProxyAnalysisCard } from './HeaderProxyAnalysisCard';
import { HeaderCategoryTabs } from './HeaderCategoryTabs';
import { HeaderSearchFilter } from './HeaderSearchFilter';
import { HeaderTable } from './HeaderTable';
import { MissingHeadersCard } from './MissingHeadersCard';
import { HeaderExportModal } from './HeaderExportModal';

export const HeadersIntelligenceView: React.FC = () => {
  const { t } = useLanguage();
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const {
    data,
    previousData,
    scoreDelta,
    dismissComparison,
    isLoading,
    isRefreshing,
    error,
    refetch,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    showOnlyRisks,
    setShowOnlyRisks,
    filteredHeaders,
    totalFilteredCount,
  } = useHeaderIntelligence();

  // Loading Skeleton State
  if (isLoading && !data) {
    return (
      <Section
        title={t.headers.title}
        subtitle={t.headers.loadingSubtitle}
      >
        <div className="space-y-6">
          <Card variant="standard" className="p-6">
            <LoadingState
              message={t.headers.loadingMessage}
            />
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </Card>

          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </Section>
    );
  }

  // Error State
  if (error && !data) {
    return (
      <Section
        title={t.headers.title}
        subtitle={t.headers.subtitle}
      >
        <ErrorState
          title={t.headers.errorTitle}
          message={error.message || t.headers.errorMessage}
          onRetry={refetch}
        />
      </Section>
    );
  }

  if (!data) return null;

  return (
    <Section
      title={t.headers.title}
      subtitle={t.headers.subtitle}
    >
      <div className="space-y-6">
        {/* Overview & Metric Summary Banner with HTTP Privacy Score */}
        <HeaderOverviewCard
          summary={data.summary}
          privacyScore={data.headerPrivacyExposureScore}
          headerSecurityScore={data.headerSecurityScore}
          privacyTier={data.privacyTier}
          scoreFactors={data.scoreFactors}
          previousData={previousData}
          scoreDelta={scoreDelta}
          onDismissComparison={dismissComparison}
          onRefresh={refetch}
          isRefreshing={isRefreshing}
          onOpenExport={() => setIsExportOpen(true)}
          onSelectCategory={setSelectedCategory}
        />

        {/* Actionable Privacy Problems Found Center */}
        <HeaderProblemCenter
          problems={data.problems}
          onSelectHeader={(headerName) => {
            setSearchQuery(headerName);
            const tableElem = document.getElementById('headers-table-section');
            if (tableElem) {
              tableElem.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        />

        {/* Client Hints Analysis (Browser Fingerprinting Exposure) */}
        <HeaderClientHintsCard analysis={data.clientHintsAnalysis} />

        {/* Cookie Security & Transport Analysis */}
        <HeaderCookieSecurityCard cookieSecurity={data.cookieSecurity} />

        {/* Proxy & Network Ingress Analysis */}
        <HeaderProxyAnalysisCard
          isInfrastructureProxy={data.isInfrastructureProxy}
          summary={data.summary}
        />

        {/* Missing Privacy & Security Headers Alert Card */}
        <MissingHeadersCard missingHeaders={data.missingHeaders} />

        {/* Category Selector Tabs */}
        <HeaderCategoryTabs
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          summary={data.summary}
        />

        {/* Search, Filter & Sort Controls */}
        <div id="headers-table-section" className="scroll-mt-6">
          <HeaderSearchFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortField={sortField}
            onSortFieldChange={setSortField}
            sortOrder={sortOrder}
            onSortOrderToggle={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            showOnlyRisks={showOnlyRisks}
            onToggleShowOnlyRisks={setShowOnlyRisks}
            totalFilteredCount={totalFilteredCount}
            totalAvailableCount={data.headers.length}
          />
        </div>

        {/* Interactive Headers Table */}
        <HeaderTable headers={filteredHeaders} searchQuery={searchQuery} />

        {/* Sync Status Footer */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-800/80 pt-4">
          <span>
            {t.headers.transportRfc}
          </span>
          <span className="text-emerald-500/90 flex items-center gap-1.5 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t.common.liveSystem}
          </span>
        </div>
      </div>

      {/* Export Modal */}
      <HeaderExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        data={data}
      />
    </Section>
  );
};
