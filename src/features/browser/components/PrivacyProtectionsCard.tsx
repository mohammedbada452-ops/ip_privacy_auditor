import React from 'react';
import { Card, StatusBadge, Badge } from '../../../components/ui';
import { Shield, ShieldCheck, ShieldOff, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { PrivacyProtectionsData, ProfileGroup } from '../types';

export interface PrivacyProtectionsCardProps {
  group: ProfileGroup<PrivacyProtectionsData>;
}

export const PrivacyProtectionsCard: React.FC<PrivacyProtectionsCardProps> = ({ group }) => {
  const { t } = useLanguage();
  const data = group.data;

  const measured = group.status === 'SUCCESS' && !!data;
  const gpc = measured ? data?.globalPrivacyControl : undefined;
  const dnt = measured ? data?.doNotTrack : undefined;
  const incognito = data?.incognitoSuspected;
  const adBlock = data?.adBlockDetected;

  return (
    <Card id="privacy-protections" variant="standard" className="p-5 flex flex-col justify-between space-y-4 scroll-mt-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{t.browser.privacyProtectionsTitle}</h3>
            <p className="text-xs text-slate-400">{t.browser.privacyProtectionsSubtitle}</p>
          </div>
        </div>
        <StatusBadge
          status={gpc === true || dnt === true ? 'success' : gpc === false || dnt === false ? 'neutral' : 'neutral'}
          label={gpc === true || dnt === true ? t.common.active : measured ? t.common.defaultOrder : t.ui.notMeasured}
          size="sm"
        />
      </div>

      {/* Signals Grid */}
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span>{t.browser.gpcSignal}:</span>
          <span className="font-mono">
            {gpc === true ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                ENABLED (Opt-out)
              </span>
            ) : (
              <span className="text-slate-500">{gpc === false ? t.ui.unspecified : t.ui.notMeasured}</span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-900">
          <span>{t.browser.dntSignal}:</span>
          <span className="font-mono">
            {dnt === true ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                DNT: 1
              </span>
            ) : (
              <span className="text-slate-500">{dnt === false ? t.ui.unspecified : t.ui.notMeasured}</span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-900">
          <span>{t.browser.incognitoHeuristic}:</span>
          <span className="font-mono text-slate-300">
            {incognito === true ? t.ui.suspectedPrivateSession : incognito === false ? t.ui.standardWindow : t.ui.notMeasured}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-900">
          <span>{t.browser.adBlockHeuristic}:</span>
          <span className="font-mono text-slate-300">
            {adBlock === true ? (
              <span className="text-emerald-400 font-semibold">{t.ui.activeFilter}</span>
            ) : adBlock === false ? (
              t.common.notDetected
            ) : (
              t.ui.notMeasured
            )}
          </span>
        </div>
      </div>
    </Card>
  );
};
