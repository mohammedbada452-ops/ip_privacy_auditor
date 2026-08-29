import React from 'react';
import { Globe } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardBody,
  Badge,
  StatusBadge,
  CopyValue,
  RefreshButton,
} from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { IpIntelligenceData } from '../types';

export interface IpPrimaryCardProps {
  data: IpIntelligenceData;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const IpPrimaryCard: React.FC<IpPrimaryCardProps> = ({
  data,
  onRefresh,
  isRefreshing,
}) => {
  const { t } = useLanguage();
  const { ip, ipVersion, isPrivate } = data.check;
  const { geo, network } = data.details;

  const isMeasuredPublic = data.check.publicIpStatus === 'MEASURED' && data.check.observationScope === 'PUBLIC';
  const locationSummary = !isMeasuredPublic
    ? t.ui.notMeasured
    : [geo.city, geo.region, geo.country]
      .filter((s) => s && s !== 'Unknown' && s !== 'Local Network' && s !== t.ui.notMeasured)
      .join(', ') || t.common.unknown;

  return (
    <Card variant="highlighted" className="relative overflow-hidden">
      {/* Background Accent Gradient */}
      <div className="absolute -right-16 -top-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <CardHeader
        icon={<Globe className="w-5 h-5 text-cyan-400" />}
        title={t.ip.detectedPublicIp}
        subtitle={t.ip.authoritativeScan}
        statusBadge={
          <Badge variant={ipVersion === 'IPv6' ? 'info' : 'neutral'}>
            {ipVersion}
          </Badge>
        }
        action={
          <RefreshButton
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            size="sm"
            label={t.common.recheck}
          />
        }
      />

      <CardBody className="space-y-5">
        {/* Main Monospace IP Presentation */}
        <div className="bg-slate-950/80 border border-slate-800 p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block">
              {isMeasuredPublic ? t.ip.activeAddress : 'Local endpoint'}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl md:text-3xl font-mono font-bold text-cyan-300 tracking-tight break-all">
                {isMeasuredPublic ? ip : `${ip} (${data.check.observationScope || 'UNKNOWN'})`}
              </span>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <CopyValue
              value={ip}
              label={t.ip.copyIp}
            />
          </div>
        </div>

        {/* Quick Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
            <span className="text-xs text-slate-400 font-sans">{t.ui.publicIp}</span>
            <span className="text-xs font-mono font-medium text-slate-200 truncate max-w-[140px]">
              {isMeasuredPublic ? ip : 'Unavailable'}
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
            <span className="text-xs text-slate-400 font-sans">
              {t.ip.location}
            </span>
            <span className="text-xs font-mono font-medium text-slate-200 truncate max-w-[140px]">
              {locationSummary}
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
            <span className="text-xs text-slate-400 font-sans">
              {t.ip.isp}
            </span>
            <span className="text-xs font-mono font-medium text-slate-200 truncate max-w-[140px]">
              {isMeasuredPublic ? (network.isp || '—') : t.ui.notMeasured}
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
            <span className="text-xs text-slate-400 font-sans">
              {t.ip.scope}
            </span>
            <StatusBadge
              status={isMeasuredPublic ? 'success' : 'warning'}
              label={isMeasuredPublic ? t.ip.publicRoutable : `${data.check.observationScope || t.ui.unverified} / ${t.ui.notMeasured}`}
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
