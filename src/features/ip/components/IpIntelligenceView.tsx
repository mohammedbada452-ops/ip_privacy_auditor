import React from 'react';
import {
  Section,
  Grid,
  LoadingState,
  ErrorState,
  Skeleton,
  Card,
} from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import { useIpIntelligence } from '../hooks/useIpIntelligence';
import { IpPrimaryCard } from './IpPrimaryCard';
import { GeoNetworkCard } from './GeoNetworkCard';
import { AsnIspCard } from './AsnIspCard';
import { SecurityFlagsCard } from './SecurityFlagsCard';
import { HeadersPreviewCard } from './HeadersPreviewCard';
import { IpReputationCard } from './IpReputationCard';
import { NetworkIntelligenceCard } from './NetworkIntelligenceCard';

export const IpIntelligenceView: React.FC = () => {
  const { t, formatDate, language } = useLanguage();
  const { data, isLoading, isRefreshing, error, refetch } = useIpIntelligence();

  // Loading Skeleton State
  if (isLoading && !data) {
    return (
      <Section
        title={t.ip.title}
        subtitle={t.ip.loadingSubtitle}
      >
        <div className="space-y-6">
          <Card variant="standard" className="p-6">
            <LoadingState message={t.ip.loadingMessage} />
            <div className="mt-6 space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </Card>

          <Grid cols={1} colsMd={2} gap={6}>
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </Grid>
        </div>
      </Section>
    );
  }

  // Error State
  if (error && !data) {
    return (
      <Section
        title={t.ip.title}
        subtitle={t.ip.subtitle}
      >
        <ErrorState
          title={t.ip.errorTitle}
          message={error.message || t.ip.errorMessage}
          onRetry={refetch}
        />
      </Section>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Section
      title={t.ip.title}
      subtitle={t.ip.subtitle}
    >
      <div className="space-y-6">
        {/* Primary IP Card */}
        <IpPrimaryCard
          data={data}
          onRefresh={refetch}
          isRefreshing={isRefreshing}
        />

        {/* Intelligence Grid */}
        <Grid cols={1} colsMd={2} gap={6}>
          <GeoNetworkCard details={data.details} networkIntelligence={data.networkIntelligence} />
          <AsnIspCard details={data.details} />
          <SecurityFlagsCard details={data.details} />
          <HeadersPreviewCard check={data.check} />
          <IpReputationCard reputation={data.reputation} />
          <NetworkIntelligenceCard data={data.networkIntelligence} />
        </Grid>

        {/* Timestamp Footer Note */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-800/80 pt-4">
          <span>
            {t.common.lastScanTimestamp}{' '}
            <span className="text-slate-400 font-mono">{formatDate(data.fetchedAt, { timeStyle: 'medium' })}</span>
          </span>
          <span className="text-emerald-500/90 flex items-center gap-1.5 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t.ip.backendDataFetched}
          </span>
        </div>
      </div>
    </Section>
  );
};
