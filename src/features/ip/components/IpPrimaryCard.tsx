import React from 'react';
import { Globe, MapPin, Network, ShieldCheck } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardBody,
  Badge,
  StatusBadge,
  CopyValue,
  CountryFlag,
  RefreshButton,
} from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { IpIntelligenceData } from '../types';
import { getCountryName, getSafeNetworkText, getStatusLabel } from '../../home/utils/networkPresentation';

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
  const { ipVersion } = data.check;
  const { geo, network } = data.details;
  const displayIp = data.details.ip || data.check.publicIp || data.check.ip;
  const isPublic = data.check.observationScope === 'PUBLIC' || data.check.publicIpStatus === 'MEASURED';
  const countryCode = geo.countryCode && geo.countryCode !== 'XX' ? geo.countryCode : undefined;
  const countryName = getCountryName(geo.country, countryCode);
  const location = [geo.city, geo.region, countryName].filter((value) => value && !/^(unknown|unavailable|not measured)$/i.test(value)).join(', ') || 'Unavailable';
  const isp = getSafeNetworkText(network.isp);
  const organization = getSafeNetworkText(network.organization);
  const asn = getSafeNetworkText(network.asn, 'Not assigned');

  return (
    <Card variant="highlighted" className="relative overflow-hidden">
      <div className="absolute -right-16 -top-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <CardHeader
        icon={<Globe className="w-5 h-5 text-cyan-400" />}
        title={t.ip.detectedPublicIp}
        subtitle={data.details.measurementStatus === 'MEASURED' ? 'Verified network intelligence' : 'Network intelligence'}
        statusBadge={<Badge variant={ipVersion === 'IPv6' ? 'info' : 'neutral'}>{ipVersion}</Badge>}
        action={<RefreshButton onRefresh={onRefresh} isRefreshing={isRefreshing} size="sm" label={t.common.recheck} />}
      />

      <CardBody className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr_1fr] gap-4">
          <div className="bg-slate-950/80 border border-slate-800 p-4 sm:p-5 rounded-xl">
            <div className="text-[10px] font-mono tracking-widest text-slate-500 uppercase mb-2">ACTIVE ADDRESS</div>
            <div className="min-w-0 w-full">
              {displayIp ? (
                <CopyValue value={displayIp} />
              ) : (
                <span className="text-xl sm:text-2xl md:text-3xl font-mono font-bold text-slate-500">Unavailable</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-2">{isPublic ? 'Public routable address' : 'Address scope could not be verified as public'}</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
            <div className="text-[10px] font-mono tracking-widest text-slate-500 uppercase mb-2">LOCATION</div>
            <div className="flex items-center gap-3">
              <CountryFlag countryCode={countryCode} countryName={countryName} className="h-8 w-12 shrink-0 rounded-md overflow-hidden border border-slate-700/70" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100 truncate">{countryName}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1 truncate"><MapPin className="w-3.5 h-3.5 shrink-0" />{location}</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-3 truncate">{geo.timezone || 'Timezone unavailable'}</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
            <div className="text-[10px] font-mono tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-1.5"><Network className="w-3.5 h-3.5" /> NETWORK</div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between gap-3"><span className="text-slate-500">ISP</span><span className="text-slate-200 truncate max-w-[180px]">{isp}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Organization</span><span className="text-slate-200 truncate max-w-[180px]">{organization}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">ASN</span><span className="text-cyan-300 truncate max-w-[180px]">{asn}</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">{t.ip.vpnConnection}</span>
            <StatusBadge status={network.isVpn == null ? 'neutral' : network.isVpn ? 'warning' : 'success'} label={getStatusLabel(network.isVpn, { detected: t.ip.detectedActive, clear: t.ip.notDetectedSafe, unavailable: t.ui.unavailable })} />
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">{t.ip.proxyServer}</span>
            <StatusBadge status={network.isProxy == null ? 'neutral' : network.isProxy ? 'warning' : 'success'} label={getStatusLabel(network.isProxy, { detected: t.ip.detectedActive, clear: t.ip.notDetectedSafe, unavailable: t.ui.unavailable })} />
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">{t.ip.torExitNode}</span>
            <StatusBadge status={network.isTor == null ? 'neutral' : network.isTor ? 'danger' : 'success'} label={getStatusLabel(network.isTor, { detected: t.ip.torNodeDanger, clear: t.ip.notDetectedSafe, unavailable: t.ui.unavailable })} />
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Source: {network.provider || 'network intelligence'} · Status: {data.details.measurementStatus || 'UNKNOWN'} · Results are provider-observed and may be approximate.</span>
        </div>
      </CardBody>
    </Card>
  );
};
