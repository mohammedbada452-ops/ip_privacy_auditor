import React from 'react';
import { ArrowRight, Cpu, FileCode2, Globe, MapPin, Network, ShieldCheck } from 'lucide-react';
import { Link } from '../../../router/Router';
import { useLanguage } from '../../../i18n/LanguageContext';
import { Card, CardBody, CardHeader, CopyValue, RefreshButton, StatusBadge } from '../../../components/ui';
import type { IpCheckResponse, IpDetailsResponse, IpNetworkIntelligenceResponse } from '@packages/api-contract';
import type { BrowserProfile, IdentityData } from '../../browser/types';
import type { HeadersAnalysisResponse } from '../../headers/types';
import { getCountryFlag, getCountryName, getLanguageCountryConsistency, getSafeNetworkText, getStatusLabel } from '../utils/networkPresentation';

interface TechnicalSummarySectionProps {
  ipCheck: IpCheckResponse | null;
  ipDetails: IpDetailsResponse | null;
  /** Additive multi-provider cross-check; never used to alter the canonical privacy score. */
  networkIntelligence?: IpNetworkIntelligenceResponse | null;
  browserProfile: BrowserProfile | null;
  headersData: HeadersAnalysisResponse | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const TechnicalSummarySection: React.FC<TechnicalSummarySectionProps> = ({
  ipCheck,
  ipDetails,
  networkIntelligence,
  browserProfile,
  headersData,
  onRefresh,
  isRefreshing = false,
}) => {
  const { t } = useLanguage();

  const observedIp = ipCheck?.publicIp || ipCheck?.ip || ipDetails?.ip || null;
  const verifiedDetails = ipDetails?.measurementStatus === 'MEASURED';
  const countryCode = ipDetails?.geo?.countryCode && ipDetails.geo.countryCode !== 'XX'
    ? ipDetails.geo.countryCode
    : undefined;
  const countryName = getCountryName(ipDetails?.geo?.country, countryCode);
  const countryFlag = getCountryFlag(countryCode);
  const locationParts = [ipDetails?.geo?.city, ipDetails?.geo?.region, countryName]
    .map((value) => String(value || '').trim())
    .filter((value) => value && !/^(unknown|unavailable|not measured)$/i.test(value));
  const location = locationParts.length ? locationParts.join(', ') : 'Unavailable';
  const isp = getSafeNetworkText(ipDetails?.network?.isp);
  const organization = getSafeNetworkText(ipDetails?.network?.organization);
  const asn = getSafeNetworkText(ipDetails?.network?.asn, 'Not assigned');
  const timezone = getSafeNetworkText(ipDetails?.geo?.timezone, 'Unknown');
  const currentNetworkTime = (() => {
    if (timezone === 'Unknown') return null;
    try {
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date());
    } catch {
      return null;
    }
  })();
  const postalCode = getSafeNetworkText(ipDetails?.geo?.postalCode, 'Not measured');
  const asOrganization = getSafeNetworkText(ipDetails?.network?.asOrganization, 'Not measured');
  const networkType = getSafeNetworkText(ipDetails?.network?.networkType, 'Not measured');
  const providerPrivacyScore = typeof ipDetails?.network?.privacyScore === 'number' ? ipDetails.network.privacyScore : null;
  const providerPrivacyGrade = ipDetails?.network?.privacyGrade || null;
  const browserTimezone = browserProfile?.groups?.IDENTITY?.data && typeof (browserProfile.groups.IDENTITY.data as IdentityData & { timezone?: string }).timezone === 'string'
    ? (browserProfile.groups.IDENTITY.data as IdentityData & { timezone?: string }).timezone || null
    : null;
  const timezoneMatch = timezone !== 'Unknown' && browserTimezone ? timezone === browserTimezone : null;
  const browserLanguage = browserProfile?.groups?.IDENTITY?.data
    ? (browserProfile.groups.IDENTITY.data as IdentityData).language || null
    : null;
  const languageConsistency = getLanguageCountryConsistency(browserLanguage, countryCode || null);
  const intelligenceConfidence = networkIntelligence?.intelligenceConfidence || null;
  const intelligenceSources = networkIntelligence?.providers?.length
    ? networkIntelligence.providers.join(', ')
    : ipDetails?.network?.provider || 'Not measured';
  const geoSourceConflict = (() => {
    const observations = networkIntelligence?.providerObservations || [];
    const countryCodes = observations
      .filter((o) => o.status === 'VERIFIED' && o.countryCode)
      .map((o) => o.countryCode!.toUpperCase());
    return new Set(countryCodes).size > 1;
  })();
  const vpnLabel = getStatusLabel(ipDetails?.network?.isVpn, {
    detected: 'VPN detected',
    clear: 'VPN not detected',
    unavailable: 'VPN status unavailable',
  });
  const proxyLabel = getStatusLabel(ipDetails?.network?.isProxy, {
    detected: 'Proxy detected',
    clear: 'Proxy not detected',
    unavailable: 'Proxy status unavailable',
  });
  const torLabel = getStatusLabel(ipDetails?.network?.isTor, {
    detected: 'Tor detected',
    clear: 'Tor not detected',
    unavailable: 'Tor status unavailable',
  });
  const hostingLabel = getStatusLabel(ipDetails?.network?.isHosting, {
    detected: 'Hosting/Datacenter detected',
    clear: 'Hosting/Datacenter not detected',
    unavailable: 'Hosting/Datacenter status unavailable',
  });

  const identityData = browserProfile?.groups?.IDENTITY?.data as IdentityData | undefined;
  const graphicsSignals = browserProfile?.groups?.GRAPHICS?.derivedSignals;
  const webrtcSignals = browserProfile?.groups?.WEBRTC?.derivedSignals;
  const canvasStatus = String(graphicsSignals?.canvasStatus || 'UNAVAILABLE');
  const canvasRandomized = Boolean(graphicsSignals?.canvasRandomized);
  const gpuStatus = String(graphicsSignals?.webglStatus || 'UNAVAILABLE');
  const gpuUnmasked = Boolean(graphicsSignals?.gpuUnmasked);
  const webrtcStatus = String(webrtcSignals?.webrtcStatus || 'UNAVAILABLE');
  const leakDetected = Boolean(webrtcSignals?.leakDetected) && webrtcStatus === 'LEAK_DETECTED';

  return (
    <section className="mb-8" aria-labelledby="technical-summary-heading">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id="technical-summary-heading" className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            {t.home.quickSummary.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-sans mt-0.5">
            {t.home.quickSummary.subtitle}
          </p>
        </div>
        {onRefresh && (
          <RefreshButton
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            size="sm"
            label={t.common.recheck}
          />
        )}
      </div>

      <Card variant="highlighted" className="relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <CardHeader
          icon={<Network className="w-5 h-5 text-cyan-400" />}
          title="Live Connection Identity"
          subtitle={verifiedDetails ? 'Verified server-side network intelligence' : 'Network intelligence currently available'}
          statusBadge={
            <StatusBadge
              status={verifiedDetails ? 'success' : 'warning'}
              label={verifiedDetails ? 'VERIFIED' : 'PARTIAL'}
            />
          }
        />
        <CardBody className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-4 items-stretch">
            <div className="rounded-xl border border-slate-800 bg-slate-950/75 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono mb-2">
                <span>ACTIVE ADDRESS</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-400">{ipCheck?.ipVersion || 'IP'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-2xl sm:text-3xl font-mono font-bold text-cyan-300 break-all select-all">
                  {observedIp || 'Unavailable'}
                </span>
                {observedIp && <CopyValue value={observedIp} label={t.ip.copyIp} />}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-2">
                Source: {ipCheck?.observationSource || ipCheck?.ipSource || 'server observed'}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/65 p-4 sm:p-5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono mb-2">LOCATION</div>
              <div className="flex items-center gap-3">
                <span className="text-3xl" role="img" aria-label={countryName}>{countryFlag}</span>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-100 truncate">{countryName}</div>
                  <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {location}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] font-mono">
                <div><span className="text-slate-600">ZIP / Postal</span><div className="text-slate-300 mt-0.5">{postalCode}</div></div>
                <div><span className="text-slate-600">Timezone</span><div className="text-slate-300 mt-0.5 truncate">{timezone}</div></div>
                <div><span className="text-slate-600">IP local time</span><div className="text-slate-300 mt-0.5 truncate">{currentNetworkTime || 'Not measured'}</div></div>
              </div>
              {browserTimezone && <div className={`mt-2 text-[11px] ${timezoneMatch === true ? 'text-emerald-400' : timezoneMatch === false ? 'text-amber-400' : 'text-slate-500'}`}>
                {timezoneMatch === true ? 'Network and device timezone match' : timezoneMatch === false ? `Timezone mismatch: device ${browserTimezone}` : 'Timezone consistency not measured'}
              </div>}
              {browserLanguage && (
                <div className={`mt-1 text-[11px] ${languageConsistency === 'MATCH' ? 'text-emerald-400' : languageConsistency === 'MISMATCH' ? 'text-amber-400' : 'text-slate-500'}`}>
                  {languageConsistency === 'MATCH'
                    ? `Browser language region matches network country (${browserLanguage})`
                    : languageConsistency === 'MISMATCH'
                    ? `Language/country mismatch: browser set to ${browserLanguage}`
                    : languageConsistency === 'AMBIGUOUS'
                    ? `Browser language (${browserLanguage}) has no region — can't be compared`
                    : 'Language consistency not measured'}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/65 p-4 sm:p-5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono mb-2">NETWORK</div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between gap-3"><span className="text-slate-500">ISP</span><span className="text-slate-200 truncate max-w-[220px]">{isp}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Organization</span><span className="text-slate-200 truncate max-w-[220px]">{organization}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">AS Organization</span><span className="text-slate-200 truncate max-w-[220px]">{asOrganization}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">ASN</span><span className="text-cyan-300 truncate max-w-[220px]">{asn}</span></div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-2.5">
            <div className="text-[11px] text-slate-500 truncate max-w-full">Source: <span className="text-slate-300">{intelligenceSources}</span></div>
            <div className="text-[11px] text-slate-500">
              Confidence:{' '}
              <span className={
                intelligenceConfidence === 'HIGH' ? 'text-emerald-400 font-semibold'
                  : intelligenceConfidence === 'MEDIUM' ? 'text-amber-400 font-semibold'
                  : intelligenceConfidence === 'LOW' ? 'text-orange-400 font-semibold'
                  : 'text-slate-300'
              }>
                {intelligenceConfidence || ipDetails?.measurementStatus || 'UNKNOWN'}
              </span>
            </div>
          </div>
          {geoSourceConflict && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 px-4 py-2 text-[11px] text-amber-300" role="note">
              {t.ip.geoSourceConflict}. {t.ip.geoSourceConflictNote}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">VPN</span>
              <StatusBadge status={ipDetails?.network?.isVpn == null ? 'neutral' : ipDetails.network.isVpn ? 'warning' : 'success'} label={vpnLabel} />
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">Proxy</span>
              <StatusBadge status={ipDetails?.network?.isProxy == null ? 'neutral' : ipDetails.network.isProxy ? 'warning' : 'success'} label={proxyLabel} />
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">Tor</span>
              <StatusBadge status={ipDetails?.network?.isTor == null ? 'neutral' : ipDetails.network.isTor ? 'danger' : 'success'} label={torLabel} />
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">Hosting</span>
              <StatusBadge status={ipDetails?.network?.isHosting == null ? 'neutral' : ipDetails.network.isHosting ? 'warning' : 'success'} label={hostingLabel} />
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">Network privacy</span>
              {providerPrivacyScore !== null ? (
                <div className="text-right"><div className="text-cyan-300 font-mono font-bold">{providerPrivacyScore}%</div><div className="text-[10px] text-slate-600">{providerPrivacyGrade ? `Grade ${providerPrivacyGrade}` : 'provider score'}</div></div>
              ) : <span className="text-xs text-slate-500">Not measured</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center gap-2.5 mb-3"><Cpu className="w-4 h-4 text-purple-400" /><span className="text-xs font-mono font-bold text-slate-200">{t.home.quickSummary.browserCardTitle}</span></div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between gap-3"><span className="text-slate-500">Browser</span><span className="text-slate-300">{identityData ? `${identityData.browserFamily} ${identityData.browserVersion}` : 'Unavailable'}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">OS</span><span className="text-slate-300">{identityData?.osFamily || 'Unavailable'}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Canvas</span><span className={canvasRandomized ? 'text-emerald-400' : canvasStatus === 'UNAVAILABLE' ? 'text-slate-400' : 'text-amber-400'}>{canvasRandomized ? 'Randomized' : canvasStatus === 'UNAVAILABLE' ? 'Not measured' : 'Signature observed'}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">WebGL</span><span className={gpuUnmasked || gpuStatus === 'EXPOSED' ? 'text-amber-400' : gpuStatus === 'MASKED' ? 'text-emerald-400' : 'text-slate-400'}>{gpuStatus === 'EXPOSED' ? 'Hardware exposed' : gpuStatus === 'MASKED' ? 'Masked' : 'Not measured'}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">WebRTC</span><span className={leakDetected ? 'text-red-400' : webrtcStatus === 'NO_LEAK' || webrtcStatus === 'PROTECTED' ? 'text-emerald-400' : 'text-slate-400'}>{leakDetected ? 'Private IP leak' : webrtcStatus === 'NO_LEAK' || webrtcStatus === 'PROTECTED' ? 'No private IP leak' : 'Not measured'}</span></div>
              </div>
              <Link to="/browser" className="inline-flex items-center gap-1.5 mt-4 text-xs text-purple-300 hover:text-purple-200"><span>{t.home.quickSummary.viewBrowserDetails}</span><ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center gap-2.5 mb-3"><FileCode2 className="w-4 h-4 text-blue-400" /><span className="text-xs font-mono font-bold text-slate-200">{t.home.quickSummary.headersCardTitle}</span></div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between"><span className="text-slate-500">Headers</span><span className="text-slate-300">{headersData?.summary?.totalReceived ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Sec-GPC</span><span className={headersData?.summary?.hasSecGpc ? 'text-emerald-400' : 'text-slate-400'}>{headersData ? (headersData.summary.hasSecGpc ? 'Active' : 'Not set') : 'Unavailable'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">DNT</span><span className={headersData?.summary?.hasDnt ? 'text-emerald-400' : 'text-slate-400'}>{headersData ? (headersData.summary.hasDnt ? 'Active' : 'Not set') : 'Unavailable'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Proxy metadata</span><span className={headersData?.summary?.hasProxyHeaders ? 'text-amber-400' : 'text-emerald-400'}>{headersData ? (headersData.summary.hasProxyHeaders ? 'Observed' : 'None') : 'Unavailable'}</span></div>
              </div>
              <Link to="/headers" className="inline-flex items-center gap-1.5 mt-4 text-xs text-blue-300 hover:text-blue-200"><span>{t.home.quickSummary.viewHeadersDetails}</span><ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center gap-2.5 mb-3"><ShieldCheck className="w-4 h-4 text-cyan-400" /><span className="text-xs font-mono font-bold text-slate-200">Evidence</span></div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between"><span className="text-slate-500">Intelligence source</span><span className="font-mono text-slate-300 truncate max-w-[160px]">{ipDetails?.network?.provider || 'Unavailable'}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Measurement</span><span className="font-mono text-slate-300">{ipDetails?.measurementStatus || 'UNKNOWN'}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Country code</span><span className="font-mono text-cyan-300">{countryCode || 'XX'}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Network type</span><span className="font-mono text-slate-300">{networkType}</span></div>
                <div className="text-[11px] leading-5 text-slate-500">Location is approximate. VPN/proxy/Tor status and provider privacy score are shown only when an explicit source signal is available.</div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </section>
  );
};
