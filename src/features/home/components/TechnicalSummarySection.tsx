import React from 'react';
import { CountryFlag } from '../../ip/components/CountryFlag';
import { ArrowRight, Cpu, FileCode2, Globe, MapPin, Network, ShieldCheck, ChevronDown } from 'lucide-react';
import { Link } from '../../../router/Router';
import { useLanguage } from '../../../i18n/LanguageContext';
import { Card, CardBody, CardHeader, CopyValue, RefreshButton, StatusBadge } from '../../../components/ui';
import type { IpCheckResponse, IpDetailsResponse, IpNetworkIntelligenceResponse } from '@packages/api-contract';
import type { BrowserProfile, IdentityData, LocaleData } from '../../browser/types';
import type { HeadersAnalysisResponse } from '../../headers/types';
import { getCountryName, getLanguageCountryConsistency, getSafeNetworkText, getStatusLabel } from '../utils/networkPresentation';

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
  const locationParts = [ipDetails?.geo?.city, ipDetails?.geo?.region, countryName]
    .map((value) => String(value || '').trim())
    .filter((value) => value && !/^(unknown|unavailable|not measured)$/i.test(value));
  const location = locationParts.length ? locationParts.join(', ') : t.ui.unavailable;
  const isp = getSafeNetworkText(ipDetails?.network?.isp);
  const organization = getSafeNetworkText(ipDetails?.network?.organization);
  const asn = getSafeNetworkText(ipDetails?.network?.asn, 'Not assigned');
  const timezone = getSafeNetworkText(ipDetails?.geo?.timezone, t.common.unknown);
  const currentNetworkTime = (() => {
    if (timezone === 'Unknown') return null;
    try {
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date());
    } catch {
      return null;
    }
  })();
  const postalCode = getSafeNetworkText(ipDetails?.geo?.postalCode, t.ui.notMeasured);
  const asOrganization = getSafeNetworkText(ipDetails?.network?.asOrganization, t.ui.notMeasured);
  const networkType = getSafeNetworkText(ipDetails?.network?.networkType, t.ui.notMeasured);
  const providerPrivacyScore = typeof ipDetails?.network?.privacyScore === 'number' ? ipDetails.network.privacyScore : null;
  const providerPrivacyGrade = ipDetails?.network?.privacyGrade || null;
  const browserTimezone = browserProfile?.groups?.IDENTITY?.data && typeof (browserProfile.groups.IDENTITY.data as IdentityData & { timezone?: string }).timezone === 'string'
    ? (browserProfile.groups.IDENTITY.data as IdentityData & { timezone?: string }).timezone || null
    : null;
  const timezoneMatch = timezone !== 'Unknown' && browserTimezone ? timezone === browserTimezone : null;
  const localeData = browserProfile?.groups?.LOCALE?.data as LocaleData | undefined;
  const browserLanguage = localeData?.language || (browserProfile?.groups?.IDENTITY?.data
    ? (browserProfile.groups.IDENTITY.data as IdentityData).language || null
    : null);
  const resolvedLocale = localeData?.resolvedLocale || browserLanguage || null;
  const languageConsistency = getLanguageCountryConsistency(browserLanguage, countryCode || null);
  const intelligenceConfidence = networkIntelligence?.intelligenceConfidence || null;
  const intelligenceSources = networkIntelligence?.providers?.length
    ? networkIntelligence.providers.join(', ')
    : ipDetails?.network?.provider || t.ui.notMeasured;
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
  const [showSecondaryDetails, setShowSecondaryDetails] = React.useState(true);

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
          title={t.ui.liveConnectionIdentity}
          subtitle={verifiedDetails ? t.ui.verifiedServerNetwork : t.ui.networkIntelligenceAvailable}
          statusBadge={
            <StatusBadge
              status={verifiedDetails ? 'success' : 'warning'}
              label={verifiedDetails ? t.ui.confirmed : t.ui.evidenceStatusPartial}
            />
          }
        />
        <CardBody className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-4 items-stretch">
            <div className="rounded-xl border border-slate-800 bg-slate-950/75 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono mb-2">
                <span>{t.ip.activeAddress}</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-400">{ipCheck?.ipVersion || 'IP'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-2xl sm:text-3xl font-mono font-bold text-cyan-300 break-all select-all">
                  {observedIp || t.ui.unavailable}
                </span>
                {observedIp && <CopyValue value={observedIp} label={t.ip.copyIp} />}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-2">
                Source: {ipCheck?.observationSource || ipCheck?.ipSource || 'server observed'}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-800/90 bg-slate-900/70 p-2.5">
                  <div className="text-[9px] uppercase tracking-wider text-slate-600 font-mono">{t.ui.measurement}</div>
                  <div className="mt-1 text-[11px] text-slate-200 font-mono truncate">{ipDetails?.measurementStatus || t.common.unknown}</div>
                </div>
                <div className="rounded-lg border border-slate-800/90 bg-slate-900/70 p-2.5">
                  <div className="text-[9px] uppercase tracking-wider text-slate-600 font-mono">{t.ip.scope}</div>
                  <div className="mt-1 text-[11px] text-cyan-300 font-mono truncate">{isPublic ? t.ui.publicRoutableAddress : t.ui.publicScopeUnverified}</div>
                </div>
                <div className="rounded-lg border border-slate-800/90 bg-slate-900/70 p-2.5">
                  <div className="text-[9px] uppercase tracking-wider text-slate-600 font-mono">{t.ui.intelligenceSource}</div>
                  <div className="mt-1 text-[11px] text-slate-200 font-mono truncate" title={intelligenceSources}>{intelligenceSources}</div>
                </div>
                <div className="rounded-lg border border-slate-800/90 bg-slate-900/70 p-2.5">
                  <div className="text-[9px] uppercase tracking-wider text-slate-600 font-mono">{t.ui.confidence}</div>
                  <div className="mt-1 text-[11px] text-slate-200 font-mono truncate">{intelligenceConfidence || ipDetails?.measurementStatus || t.common.unknown}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/65 p-4 sm:p-5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono mb-2">{t.ip.location}</div>
              <div className="flex items-center gap-3 min-w-0">
                <CountryFlag countryCode={countryCode} countryName={countryName} />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-100 truncate">{countryName}</div>
                  <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" /> {location}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] font-mono">
                <div><span className="text-slate-600">{t.ip.postalCode}</span><div className="text-slate-300 mt-0.5">{postalCode}</div></div>
                <div><span className="text-slate-600">{t.ip.timezone}</span><div className="text-slate-300 mt-0.5 truncate">{timezone}</div></div>
                <div><span className="text-slate-600">{t.ui.ipLocalTime}</span><div className="text-slate-300 mt-0.5 truncate">{currentNetworkTime || t.ui.notMeasured}</div></div>
              </div>
              {browserTimezone && <div className={`mt-2 text-[11px] ${timezoneMatch === true ? 'text-emerald-400' : timezoneMatch === false ? 'text-amber-400' : 'text-slate-500'}`}>
                {timezoneMatch === true ? t.ui.networkTimezoneMatch : timezoneMatch === false ? t.ui.timezoneMismatch.replace('{timezone}', browserTimezone) : t.ui.timezoneConsistencyNotMeasured}
              </div>}
              {browserLanguage && (
                <div className="mt-2 space-y-1 rounded-lg border border-slate-800/80 bg-slate-950/35 p-2.5">
                  <div className="flex items-center justify-between gap-3 text-[10px] font-mono">
                    <span className="text-slate-600">{t.ui.browserSignal}</span>
                    <span className="text-slate-300 truncate" title={browserLanguage}>{browserLanguage}</span>
                  </div>
                  {resolvedLocale && resolvedLocale !== browserLanguage && (
                    <div className="flex items-center justify-between gap-3 text-[10px] font-mono">
                      <span className="text-slate-600">{t.browser.resolvedLocale}</span>
                      <span className="text-slate-300 truncate" title={resolvedLocale}>{resolvedLocale}</span>
                    </div>
                  )}
                  <div className={`text-[10px] leading-4 ${languageConsistency === 'MATCH' ? 'text-emerald-400' : languageConsistency === 'MISMATCH' ? 'text-amber-400' : 'text-slate-500'}`}>
                    {languageConsistency === 'MATCH'
                      ? `${t.home.remediationCenter.match}: ${browserLanguage}`
                      : languageConsistency === 'MISMATCH'
                      ? `${t.home.remediationCenter.mismatch}: ${browserLanguage}`
                      : languageConsistency === 'AMBIGUOUS'
                      ? `${t.home.remediationCenter.statusNotVerifiable}: ${browserLanguage} — no regional subtag`
                      : t.home.remediationCenter.statusUnavailable}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/65 p-4 sm:p-5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono mb-2">{t.ui.networkSignal}</div>
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(7.5rem,0.8fr)_minmax(0,1.6fr)] gap-1.5 text-xs font-mono">
                <div className="rounded-md bg-slate-950/30 px-2 py-1.5 text-slate-500 whitespace-nowrap">{t.ip.isp}</div>
                <div className="rounded-md bg-slate-950/30 px-2 py-1.5 text-slate-200 min-w-0 break-words">{isp}</div>
                <div className="rounded-md bg-slate-950/30 px-2 py-1.5 text-slate-500 whitespace-nowrap">{t.ip.organization}</div>
                <div className="rounded-md bg-slate-950/30 px-2 py-1.5 text-slate-200 min-w-0 break-words">{organization}</div>
                <div className="rounded-md bg-slate-950/30 px-2 py-1.5 text-slate-500 whitespace-nowrap">AS {t.ip.organization}</div>
                <div className="rounded-md bg-slate-950/30 px-2 py-1.5 text-slate-200 min-w-0 break-words">{asOrganization}</div>
                <div className="rounded-md bg-slate-950/30 px-2 py-1.5 text-slate-500 whitespace-nowrap">{t.ip.asnIdentifier}</div>
                <div className="rounded-md bg-slate-950/30 px-2 py-1.5 text-cyan-300 min-w-0 break-words">{asn}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-2.5">
            <div className="text-[11px] text-slate-500 truncate max-w-full">{t.ui.sourcePrefix}: <span className="text-slate-300">{intelligenceSources}</span></div>
            <div className="text-[11px] text-slate-500">
              {t.ui.confidence}:{' '}
              <span className={
                intelligenceConfidence === 'HIGH' ? 'text-emerald-400 font-semibold'
                  : intelligenceConfidence === 'MEDIUM' ? 'text-amber-400 font-semibold'
                  : intelligenceConfidence === 'LOW' ? 'text-orange-400 font-semibold'
                  : 'text-slate-300'
              }>
                {intelligenceConfidence || ipDetails?.measurementStatus || t.common.unknown}
              </span>
            </div>
          </div>
          {geoSourceConflict && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 px-4 py-2 text-[11px] text-amber-300" role="note">
              {t.ip.geoSourceConflict}. {t.ip.geoSourceConflictNote}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-mono">{t.common.details}</div>
            </div>
            <button
              type="button"
              onClick={() => setShowSecondaryDetails((open) => !open)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 text-xs font-semibold text-slate-200 hover:border-cyan-500/40 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
              aria-expanded={showSecondaryDetails}
              aria-controls="technical-secondary-details"
            >
              <span>{t.common.details}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSecondaryDetails ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          </div>

          {showSecondaryDetails && (
            <div id="technical-secondary-details" className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 flex flex-col items-start justify-between gap-2">
              <span className="text-xs text-slate-400">{t.ip.vpnConnection}</span>
              <StatusBadge status={ipDetails?.network?.isVpn == null ? 'neutral' : ipDetails.network.isVpn ? 'warning' : 'success'} label={vpnLabel} className="w-full min-w-0 justify-center text-center whitespace-normal break-words leading-tight" />
            </div>
            <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 flex flex-col items-start justify-between gap-2">
              <span className="text-xs text-slate-400">{t.ip.proxyServer}</span>
              <StatusBadge status={ipDetails?.network?.isProxy == null ? 'neutral' : ipDetails.network.isProxy ? 'warning' : 'success'} label={proxyLabel} className="w-full min-w-0 justify-center text-center whitespace-normal break-words leading-tight" />
            </div>
            <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 flex flex-col items-start justify-between gap-2">
              <span className="text-xs text-slate-400">{t.ip.torExitNode}</span>
              <StatusBadge status={ipDetails?.network?.isTor == null ? 'neutral' : ipDetails.network.isTor ? 'danger' : 'success'} label={torLabel} className="w-full min-w-0 justify-center text-center whitespace-normal break-words leading-tight" />
            </div>
            <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 flex flex-col items-start justify-between gap-2">
              <span className="text-xs text-slate-400">{t.ip.datacenterHosting}</span>
              <StatusBadge status={ipDetails?.network?.isHosting == null ? 'neutral' : ipDetails.network.isHosting ? 'warning' : 'success'} label={hostingLabel} className="w-full min-w-0 justify-center text-center whitespace-normal break-words leading-tight" />
            </div>
            <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 flex flex-col items-start justify-between gap-2">
              <span className="text-xs text-slate-400">{t.ui.providerNetworkPrivacy}</span>
              {providerPrivacyScore !== null ? (
                <div className="text-right"><div className="text-cyan-300 font-mono font-bold">{providerPrivacyScore}%</div><div className="text-[10px] text-slate-600">{providerPrivacyGrade ? `${t.ui.providerGrade} ${providerPrivacyGrade}` : t.ui.providerReportedScore}</div></div>
              ) : <span className="text-xs text-slate-500">{t.ui.notMeasured}</span>}
            </div>
          </div>
          {ipDetails?.network?.isProxy === true && (
            <div className="mt-3 rounded-lg border border-sky-500/20 bg-sky-950/20 px-3.5 py-2.5 text-[11px] text-sky-200/90 leading-relaxed" role="note">
              <span className="font-semibold text-sky-200">{t.ui.networkContext}:</span> {t.ui.networkContextDescription}
            </div>
          )}


              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center gap-2.5 mb-3"><Cpu className="w-4 h-4 text-purple-400" /><span className="text-xs font-mono font-bold text-slate-200">{t.home.quickSummary.browserCardTitle}</span></div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between gap-3"><span className="text-slate-500">{t.ui.browser}</span><span className="text-slate-300">{identityData ? `${identityData.browserFamily} ${identityData.browserVersion}` : t.ui.unavailable}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">{t.ui.os}</span><span className="text-slate-300">{identityData?.osFamily || t.ui.unavailable}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">{t.browser.canvasSignature}</span><span className={canvasRandomized ? 'text-emerald-400' : canvasStatus === 'UNAVAILABLE' ? 'text-slate-400' : 'text-amber-400'}>{canvasRandomized ? t.ui.randomizedObserved : canvasStatus === 'UNAVAILABLE' ? t.ui.notMeasured : t.ui.signatureObserved}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">{t.browser.webglHardware}</span><span className={gpuUnmasked || gpuStatus === 'EXPOSED' ? 'text-amber-400' : gpuStatus === 'MASKED' ? 'text-emerald-400' : 'text-slate-400'}>{gpuStatus === 'EXPOSED' ? t.ui.hardwareDisclosed : gpuStatus === 'MASKED' ? t.ui.rendererMasked : t.ui.notMeasured}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">{t.browser.webrtcStatus}</span><span className={leakDetected ? 'text-red-400' : webrtcStatus === 'NO_LEAK' || webrtcStatus === 'PROTECTED' ? 'text-emerald-400' : 'text-slate-400'}>{leakDetected ? t.ui.privateIpLeak : webrtcStatus === 'NO_LEAK' || webrtcStatus === 'PROTECTED' ? t.ui.noPrivateIpLeak : t.ui.notMeasured}</span></div>
              </div>
              <Link to="/browser" className="inline-flex items-center gap-1.5 mt-4 text-xs text-purple-300 hover:text-purple-200"><span>{t.home.quickSummary.viewBrowserDetails}</span><ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center gap-2.5 mb-3"><FileCode2 className="w-4 h-4 text-blue-400" /><span className="text-xs font-mono font-bold text-slate-200">{t.home.quickSummary.headersCardTitle}</span></div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between"><span className="text-slate-500">{t.ui.headersCount}</span><span className="text-slate-300">{headersData?.summary?.totalReceived ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t.ip.secGpc}</span><span className={headersData?.summary?.hasSecGpc ? 'text-emerald-400' : 'text-slate-400'}>{headersData ? (headersData.summary.hasSecGpc ? t.ui.active : t.ui.notSet) : t.ui.unavailable}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t.ip.dnt}</span><span className={headersData?.summary?.hasDnt ? 'text-emerald-400' : 'text-slate-400'}>{headersData ? (headersData.summary.hasDnt ? t.ui.active : t.ui.notSet) : t.ui.unavailable}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t.ui.proxyMetadata}</span><span className={headersData?.summary?.hasProxyHeaders ? 'text-amber-400' : 'text-emerald-400'}>{headersData ? (headersData.summary.hasProxyHeaders ? t.ui.observed : t.ui.none) : t.ui.unavailable}</span></div>
              </div>
              <Link to="/headers" className="inline-flex items-center gap-1.5 mt-4 text-xs text-blue-300 hover:text-blue-200"><span>{t.home.quickSummary.viewHeadersDetails}</span><ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center gap-2.5 mb-3"><ShieldCheck className="w-4 h-4 text-cyan-400" /><span className="text-xs font-mono font-bold text-slate-200">{t.ui.problemEvidence}</span></div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between"><span className="text-slate-500">{t.ui.intelligenceSource}</span><span className="font-mono text-slate-300 truncate max-w-[160px]">{ipDetails?.network?.provider || t.ui.unavailable}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">{t.ui.measurement}</span><span className="font-mono text-slate-300">{ipDetails?.measurementStatus || t.common.unknown}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">{t.ui.countryCode}</span><span className="font-mono text-cyan-300">{countryCode || 'XX'}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">{t.ui.networkType}</span><span className="font-mono text-slate-300">{networkType}</span></div>
                <div className="text-[11px] leading-5 text-slate-500">{t.ui.locationApproximate}</div>
              </div>
            </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </section>
  );
};
