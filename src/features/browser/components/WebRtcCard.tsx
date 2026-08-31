import React from 'react';
import { Card, StatusBadge, Badge } from '../../../components/ui';
import { Radio, ShieldAlert, ShieldCheck, HelpCircle } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { WebRtcData, ProfileGroup } from '../types';

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

  const badgeStatus = isUnavailable ? 'neutral' : leakDetected ? 'danger' : hasPublicCandidate ? 'warning' : 'success';
  const badgeLabel = isUnavailable ? 'Unavailable' : leakDetected ? 'Private IP Leak' : hasPublicCandidate ? 'Public Candidate — Review' : 'No Private Leak Detected';

  return (
    <Card id="webrtc" variant="standard" className="p-5 flex flex-col justify-between space-y-4 scroll-mt-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{t.browser.webrtcTitle}</h3>
            <p className="text-xs text-slate-400">{t.browser.webrtcSubtitle}</p>
          </div>
        </div>
        <StatusBadge
          status={badgeStatus}
          label={badgeLabel}
          size="sm"
        />
      </div>

      {/* Leak Status Banner */}
      {!isUnavailable ? (
        <div
          className={`p-3 rounded-lg border text-xs ${
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
            <div>
              <span className="font-semibold block mb-0.5">
                {leakDetected ? t.browser.webrtcLeakDetected : hasPublicCandidate ? `${t.ui.publicIceCandidates}: ${t.common.detected} — ${t.ui.candidateUnknown}` : t.browser.webrtcNoLeak}
              </span>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {leakDetected ? t.browser.webrtcRemediation : hasPublicCandidate ? `${t.ui.publicIceCandidates} ${t.common.detected}. ${t.ui.candidateUnknown}; public-IP leakage requires server-egress correlation.` : mdnsCandidates.length > 0 ? t.browser.webrtcMdns : t.browser.webrtcNoLeak}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
          <span>{t.ui.webrtcUnavailable}</span>
        </div>
      )}

      {/* Candidate IP Tables */}
      {!isUnavailable && (
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] mb-1">{t.browser.webrtcLocalIps}:</span>
            {localIps.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {localIps.map((ip, i) => (
                  <span key={i} className="font-mono text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-900/50">
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
                  <span key={i} className="font-mono text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
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
                  <span key={i} className="font-mono text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-900/30 text-[10px] truncate max-w-full">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
        <span className="font-mono text-[11px]">RTCPeerConnection STUN</span>
        <Badge variant={isUnavailable ? 'neutral' : leakDetected ? 'danger' : 'success'} size="sm">
          {isUnavailable ? t.ui.notEvaluated : leakDetected ? t.ui.webRtcLeak : hasPublicCandidate ? t.ui.candidateUnknown : t.ui.noPrivateIpLeak}
        </Badge>
      </div>
    </Card>
  );
};
