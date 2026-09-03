import React from 'react';
import { Card, StatusBadge, Badge } from '../../../components/ui';
import { Radio, ShieldAlert, ShieldCheck, HelpCircle } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { WebRtcData, ProfileGroup } from '../types';
import { canonicalStateToBadgeStatus, canonicalizeSignalState, getCanonicalSignalLabel } from '../../../lib/signalState';

export interface WebRtcCardProps {
  group: ProfileGroup<WebRtcData>;
}

export const WebRtcCard: React.FC<WebRtcCardProps> = ({ group }) => {
  const { t } = useLanguage();
  const data = group.data;
  const isUnavailable = !data || group.status === 'UNAVAILABLE' || group.status === 'ERROR' || ['UNAVAILABLE','BLOCKED','TIMEOUT','ERROR'].includes(data?.status || '');
  const leakDetected = !isUnavailable && data?.status === 'LEAK_DETECTED';
  const hasPublicCandidate = !isUnavailable && (data?.publicIps?.length || 0) > 0;
  const localIps = data?.localIps || [];
  const publicIps = data?.publicIps || [];
  const mdnsCandidates = data?.mdnsCandidates || [];

  const canonicalState = canonicalizeSignalState({
    available: !isUnavailable,
    evidenceState: isUnavailable ? 'UNAVAILABLE' : leakDetected ? 'CONFIRMED' : hasPublicCandidate ? 'UNKNOWN' : 'NOT_DETECTED',
    observed: !isUnavailable,
  });
  const badgeStatus = leakDetected ? 'danger' : canonicalStateToBadgeStatus(canonicalState);
  const badgeLabel = getCanonicalSignalLabel(canonicalState, t);

  return (
    <Card id="webrtc" variant="standard" className="p-5 min-w-0 overflow-hidden flex flex-col justify-between space-y-4 scroll-mt-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
            <Radio className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-100 break-words">{t.browser.webrtcTitle}</h3>
            <p className="text-xs text-slate-400 break-words">{t.browser.webrtcSubtitle}</p>
          </div>
        </div>
        <StatusBadge
          status={badgeStatus}
          label={badgeLabel}
          size="sm"
          className="min-w-0 max-w-[44%] sm:max-w-[48%] shrink-0 text-center justify-center whitespace-normal break-words leading-tight"
        />
      </div>

      {/* Leak Status Banner */}
      {!isUnavailable ? (
        <div
          className={`p-3 rounded-lg border text-xs min-w-0 ${
            leakDetected
              ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
              : hasPublicCandidate
                ? 'bg-amber-950/30 border-amber-900/50 text-amber-300'
                : 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300'
          }`}
        >
          <div className="flex items-start gap-2">
            {leakDetected ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            ) : hasPublicCandidate ? (
              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 break-words overflow-wrap-anywhere">
              <span className="font-semibold block mb-0.5 break-words overflow-wrap-anywhere">
                {leakDetected ? t.browser.webrtcLeakDetected : hasPublicCandidate ? `${t.ui.publicIceCandidates}: ${t.common.detected} — ${t.ui.candidateUnknown}` : t.browser.webrtcNoLeak}
              </span>
              <p className="text-[11px] opacity-90 leading-relaxed break-words overflow-wrap-anywhere max-w-full">
                {leakDetected ? t.browser.webrtcRemediation : hasPublicCandidate ? `${t.ui.publicIceCandidates} ${t.common.detected}. ${t.ui.candidateUnknown}; public-IP leakage requires server-egress correlation.` : mdnsCandidates.length > 0 ? t.browser.webrtcMdns : t.browser.webrtcNoLeak}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="min-w-0 break-words">{t.ui.webrtcUnavailable}</span>
        </div>
      )}

      {/* Candidate IP Tables */}
      {!isUnavailable && (
        <div className="w-full min-w-0 p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] mb-1">{t.browser.webrtcLocalIps}:</span>
            {localIps.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {localIps.map((ip, i) => (
                  <span key={i} className="font-mono text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-900/50 break-all max-w-full">
                    {ip}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-emerald-400 font-mono text-[11px]">{t.browser.webrtcNoLeak}</span>
            )}
          </div>

          <div className="pt-2 border-t border-slate-900">
            <span className="text-slate-400 block text-[11px] mb-1">{t.browser.webrtcPublicIps}:</span>
            {publicIps.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {publicIps.map((ip, i) => (
                  <span key={i} className="font-mono text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 break-all max-w-full">
                    {ip}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-500 font-mono text-[11px]">{t.browser.webrtcNoPublicCandidates}</span>
            )}
          </div>

          {mdnsCandidates.length > 0 && (
            <div className="pt-2 border-t border-slate-900">
              <span className="text-slate-400 block text-[11px] mb-1">{t.browser.webrtcMdns}:</span>
              <div className="flex flex-wrap gap-1.5">
                {mdnsCandidates.map((c, i) => (
                  <span key={i} className="font-mono text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-900/30 text-[10px] break-all max-w-full">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="flex flex-col gap-2 text-xs text-slate-400 pt-1 border-t border-slate-800/60 min-w-0">
        <span className="font-mono text-[11px]">RTCPeerConnection STUN</span>
        <Badge variant={badgeStatus === 'danger' ? 'danger' : badgeStatus === 'warning' ? 'warning' : badgeStatus === 'success' ? 'success' : badgeStatus === 'info' ? 'info' : 'neutral'} size="sm" className="self-start whitespace-normal break-words">
          {getCanonicalSignalLabel(canonicalState, t)}
        </Badge>
      </div>
    </Card>
  );
};
