import React from 'react';
import { Card, StatusBadge } from '../../../components/ui';
import { Globe, Clock, Languages } from 'lucide-react';
import { canonicalStateToBadgeStatus, canonicalizeSignalState, getCanonicalSignalLabel } from '../../../lib/signalState';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { LocaleData, TimezoneData, ProfileGroup } from '../types';

export interface LocaleTimezoneCardProps {
  localeGroup: ProfileGroup<LocaleData>;
  timezoneGroup: ProfileGroup<TimezoneData>;
}

export const LocaleTimezoneCard: React.FC<LocaleTimezoneCardProps> = ({
  localeGroup,
  timezoneGroup,
}) => {
  const { t } = useLanguage();
  const loc = localeGroup.data;
  const tz = timezoneGroup.data;

  const browserLanguage = loc?.language || 'en-US';
  const configuredLanguages = loc?.languages?.join(', ') || 'en-US, en';
  const timezoneName = tz?.timezone || 'UTC';
  const utcOffset = tz?.formattedOffset || '+00:00';
  const isDst = tz?.dstActive ?? false;
  const isUnavailable = [localeGroup.status, timezoneGroup.status].some((status) => ['UNAVAILABLE', 'ERROR', 'TIMEOUT', 'BLOCKED'].includes(status));
  const canonicalState = canonicalizeSignalState({ available: !isUnavailable, evidenceState: isUnavailable ? 'UNAVAILABLE' : 'CONFIRMED', observed: !isUnavailable });

  return (
    <Card id="locale" variant="standard" className="p-5 flex flex-col justify-between space-y-4 scroll-mt-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-lg text-teal-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{t.browser.localeTimezoneTitle}</h3>
            <p className="text-xs text-slate-400">{t.browser.localeTimezoneSubtitle}</p>
          </div>
        </div>
        <StatusBadge status={canonicalStateToBadgeStatus(canonicalState)} label={getCanonicalSignalLabel(canonicalState, t)} size="sm" />
      </div>

      {/* Regional & Timezone Grid */}
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2 text-xs">
        <div>
          <span className="text-slate-400 block text-[11px] mb-0.5">{t.browser.browserLanguage}</span>
          <div className="font-mono text-slate-100 font-semibold break-words">{browserLanguage}</div>
          <div className="text-[10px] text-slate-500 mt-1">{t.browser.resolvedLocale}: {loc?.resolvedLocale || browserLanguage}</div>
        </div>
        <div className="pt-2 border-t border-slate-900">
          <span className="text-slate-400 block text-[11px] mb-0.5">{t.browser.resolvedTimezone}</span>
          <div className="font-mono text-slate-100 font-semibold break-words">{timezoneName}</div>
        </div>

        <div className="pt-2 border-t border-slate-900 grid grid-cols-2 gap-2">
          <div>
            <span className="text-slate-400 block text-[11px]">{t.browser.utcOffset}</span>
            <span className="font-mono text-slate-200">{utcOffset}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">{t.browser.daylightSavings}</span>
            <span className="font-mono text-slate-200">
              {isDst ? 'Active (DST)' : 'Standard (Non-DST)'}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900">
          <span className="text-slate-400 block text-[11px] mb-0.5">{t.browser.configuredLanguages}</span>
          <div className="font-mono text-slate-200 text-[11px] break-words">
            {configuredLanguages}
          </div>
        </div>
      </div>
    </Card>
  );
};
