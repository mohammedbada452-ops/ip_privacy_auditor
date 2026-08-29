import React from 'react';
import { Globe, Cpu, FileCode2, ArrowRight } from 'lucide-react';
import { Link } from '../../../router/Router';
import { useLanguage } from '../../../i18n/LanguageContext';
import type {
  IpCheckResponse,
  IpDetailsResponse,
} from '@packages/api-contract';
import type { BrowserProfile, IdentityData } from '../../browser/types';
import type { HeadersAnalysisResponse } from '../../headers/types';

interface TechnicalSummarySectionProps {
  ipCheck: IpCheckResponse | null;
  ipDetails: IpDetailsResponse | null;
  browserProfile: BrowserProfile | null;
  headersData: HeadersAnalysisResponse | null;
}

export const TechnicalSummarySection: React.FC<TechnicalSummarySectionProps> = ({
  ipCheck,
  ipDetails,
  browserProfile,
  headersData,
}) => {
  const { t } = useLanguage();

  // Location string calculation with semantic private network fallback (zero fabrication)
  const getLocationString = () => {
    if (!ipCheck) return t.common.loading;
    if (ipCheck.connectionType === 'LOCAL_DEVELOPMENT' || ipCheck.observationScope === 'LOOPBACK') return 'Local Development';
    if (ipCheck.isPrivate || ipCheck.observationScope !== 'PUBLIC') return `${ipCheck.observationScope || 'LOCAL'} (${t.ip.notAssigned})`;
    if (!ipDetails || !ipDetails.geo || !ipDetails.geo.country) return t.common.unknown;
    const parts = [ipDetails.geo.city, ipDetails.geo.region, ipDetails.geo.country].filter(
      (p) => p && p !== 'Unknown' && p !== 'Local'
    );
    return parts.length > 0 ? parts.join(', ') : t.common.unknown;
  };

  const getIspString = () => {
    if (!ipCheck) return t.common.loading;
    if (ipCheck.connectionType === 'LOCAL_DEVELOPMENT' || ipCheck.observationScope === 'LOOPBACK') return 'Not Applicable';
    if (ipCheck.isPrivate || ipCheck.observationScope !== 'PUBLIC') return t.ip.notAssigned;
    if (!ipDetails || !ipDetails.network || !ipDetails.network.isp) return t.common.unknown;
    return ipDetails.network.isp;
  };

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
      <div className="mb-4">
        <h2 id="technical-summary-heading" className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
          <Globe className="w-5 h-5 text-cyan-400" />
          {t.home.quickSummary.title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 font-sans mt-0.5">
          {t.home.quickSummary.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: IP & Network */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Globe className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold text-slate-200">
                  {t.home.quickSummary.ipCardTitle}
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  {ipCheck ? ipCheck.ipVersion : 'IP'}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">{t.ip.activeAddress}</span>
                <span className="text-cyan-300 font-semibold truncate max-w-[180px] select-all">
                  {ipCheck ? (ipCheck.connectionType === 'LOCAL_DEVELOPMENT' || ipCheck.observationScope === 'LOOPBACK' ? `${ipCheck.localAddress || ipCheck.ip} (LOOPBACK)` : ipCheck.observationScope === 'PUBLIC' ? ipCheck.publicIp || ipCheck.ip : `${ipCheck.ip} (${ipCheck.observationScope || 'UNKNOWN'})`) : t.common.loading}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">{t.ip.location}</span>
                <span className="text-slate-300 truncate max-w-[180px]">
                  {getLocationString()}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">{t.ip.isp}</span>
                <span className="text-slate-300 truncate max-w-[180px]">
                  {getIspString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Browser Signals */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold text-slate-200">
                  {t.home.quickSummary.browserCardTitle}
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  {identityData ? `${identityData.browserFamily} ${identityData.browserVersion}` : t.ui.signals}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">{t.browser.canvasSignature}</span>
                <span className={canvasRandomized ? 'text-emerald-400' : canvasStatus === 'UNAVAILABLE' || canvasStatus === 'BLOCKED' || canvasStatus === 'ERROR' ? 'text-slate-400' : 'text-amber-400'}>
                  {browserProfile
                    ? canvasRandomized
                      ? t.ui.randomizedObserved
                      : canvasStatus === 'SUCCESS' || canvasStatus === 'STABLE_SIGNATURE' || canvasStatus === 'DISTINGUISHABLE_SIGNATURE'
                        ? t.ui.signatureObserved
                        : canvasStatus === 'BLOCKED'
                          ? t.ui.blockedNotMeasured
                          : canvasStatus === 'ERROR'
                            ? t.ui.collectorError
                            : t.ui.notMeasured
                    : t.common.loading}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">{t.browser.webglHardware}</span>
                <span className={gpuUnmasked ? 'text-amber-400' : gpuStatus === 'MASKED' ? 'text-emerald-400' : 'text-slate-400'}>
                  {browserProfile
                    ? gpuStatus === 'EXPOSED'
                      ? t.browser.webglExposed
                      : gpuStatus === 'MASKED'
                        ? t.browser.webglMasked
                        : gpuStatus === 'BLOCKED'
                          ? t.ui.blockedNotMeasured
                          : gpuStatus === 'ERROR'
                            ? t.ui.collectorError
                            : t.ui.notMeasured
                    : t.common.loading}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">WebRTC</span>
                <span className={leakDetected ? 'text-red-400' : webrtcStatus === 'NO_LEAK' || webrtcStatus === 'PROTECTED' ? 'text-emerald-400' : 'text-slate-400'}>
                  {browserProfile
                    ? leakDetected
                      ? t.ui.privateIpLeak
                      : webrtcStatus === 'PUBLIC_CANDIDATE_REVIEW'
                        ? t.ui.publicCandidateReview
                        : webrtcStatus === 'NO_LEAK' || webrtcStatus === 'PROTECTED'
                          ? t.ui.noPrivateIpLeak
                          : webrtcStatus === 'BLOCKED'
                            ? t.ui.blockedNotMeasured
                            : webrtcStatus === 'ERROR'
                              ? t.ui.collectorError
                              : t.ui.notMeasured
                    : t.common.loading}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">Sec-GPC</span>
                <span className={headersData?.summary.hasSecGpc ? 'text-emerald-400' : 'text-slate-400'}>
                  {headersData ? (headersData.summary.hasSecGpc ? t.ui.activeOne : t.ui.notSet) : t.common.loading}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">DNT</span>
                <span className={headersData?.summary.hasDnt ? 'text-emerald-400' : 'text-slate-400'}>
                  {headersData ? (headersData.summary.hasDnt ? t.ui.activeOne : t.ui.notSet) : t.common.loading}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">{t.headers.proxyHeaders}</span>
                <span className={headersData?.summary.hasProxyHeaders ? 'text-amber-400' : 'text-emerald-400'}>
                  {headersData ? (headersData.summary.hasProxyHeaders ? t.common.detected : t.ui.noneDetected) : t.common.loading}
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/browser"
            className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-purple-950/30 hover:bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-mono font-semibold transition-all mt-2"
          >
            <span>{t.home.quickSummary.viewBrowserDetails}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 3: HTTP Request Headers */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <FileCode2 className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold text-slate-200">
                  {t.home.quickSummary.headersCardTitle}
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  {headersData ? `${headersData.summary.totalReceived} ${t.ui.headersCount}` : 'HTTP/1.1+'}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">Sec-GPC</span>
                <span className={headersData?.summary.hasSecGpc ? 'text-emerald-400' : 'text-slate-400'}>
                  {headersData ? (headersData.summary.hasSecGpc ? t.ui.activeOne : t.ui.notSet) : t.common.loading}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">DNT</span>
                <span className={headersData?.summary.hasDnt ? 'text-emerald-400' : 'text-slate-400'}>
                  {headersData ? (headersData.summary.hasDnt ? t.ui.activeOne : t.ui.notSet) : t.common.loading}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">{t.headers.proxyHeaders}</span>
                <span className={headersData?.summary.hasProxyHeaders ? 'text-amber-400' : 'text-emerald-400'}>
                  {headersData ? (headersData.summary.hasProxyHeaders ? t.common.detected : t.ui.noneDetected) : t.common.loading}
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/headers"
            className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-blue-950/30 hover:bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-mono font-semibold transition-all mt-2"
          >
            <span>{t.home.quickSummary.viewHeadersDetails}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};
