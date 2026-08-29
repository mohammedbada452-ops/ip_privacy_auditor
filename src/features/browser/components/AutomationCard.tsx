import React from 'react';
import { Card, StatusBadge, Badge } from '../../../components/ui';
import { Bot, UserCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { AutomationData, ProfileGroup } from '../types';

export interface AutomationCardProps {
  group: ProfileGroup<AutomationData>;
}

export const AutomationCard: React.FC<AutomationCardProps> = ({ group }) => {
  const { t } = useLanguage();
  const data = group.data;
  const measured = group.status === 'SUCCESS' && !!data;
  const isAutomation = measured ? data?.isAutomation : undefined;
  const isWebDriver = measured ? data?.isWebDriver : undefined;
  const signals = measured ? (data?.automationSignals ?? []) : [];

  return (
    <Card id="automation" variant="standard" className="p-5 flex flex-col justify-between space-y-4 scroll-mt-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            {isAutomation === true ? <Bot className="w-5 h-5 text-rose-400" /> : measured ? <UserCheck className="w-5 h-5 text-emerald-400" /> : <ShieldAlert className="w-5 h-5 text-slate-400" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{t.browser.automationTitle}</h3>
            <p className="text-xs text-slate-400">{t.browser.automationSubtitle}</p>
          </div>
        </div>
        <StatusBadge
          status={isAutomation === true ? 'danger' : isAutomation === false ? 'not-detected' : 'neutral'}
          label={isAutomation === true ? t.browser.automationDetectedBadge : isAutomation === false ? t.common.notDetected : t.ui.notMeasured}
          size="sm"
        />
      </div>

      {/* Assessment Summary */}
      <div
        className={`p-3 rounded-lg border text-xs ${
          isAutomation === true
            ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
            : 'bg-slate-950 border-slate-800/80 text-slate-300'
        }`}
      >
        <div className="flex items-start gap-2">
          {isAutomation === true ? (
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-semibold block mb-0.5">{t.browser.automationStatusLabel}</span>
            <p className="text-[11px] opacity-90 leading-relaxed">
              {isAutomation === true
                ? t.ui.detectedAutomationSignals.replace('{signals}', signals.join(', '))
                : isAutomation === false
                ? t.browser.automationClean
                : t.ui.notMeasured}
            </p>
          </div>
        </div>
      </div>

      {/* Technical Driver Indicators */}
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span>{t.browser.automationDriver} (navigator.webdriver):</span>
          <span className="font-mono text-slate-200">
            {isWebDriver === true ? (
              <span className="text-rose-400 font-bold">{t.common.trueLabel.toUpperCase()}</span>
            ) : isWebDriver === false ? (
              <span className="text-emerald-400 font-medium">{t.common.falseLabel.toUpperCase()}</span>
            ) : (
              <span className="text-slate-500 font-medium">{t.ui.notMeasured}</span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-400 pt-1.5 border-t border-slate-900">
          <span>{t.ui.headlessChromeSignals}:</span>
          <span className="font-mono text-slate-200">
            {!measured ? t.ui.notMeasured : signals.includes('HEADLESS_USER_AGENT') ? t.common.detected : t.common.notDetected}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-400 pt-1.5 border-t border-slate-900">
          <span>{t.ui.driverHooks}:</span>
          <span className="font-mono text-slate-200">
            {!measured ? t.ui.notMeasured : signals.includes('CDC_OR_SELENIUM_HOOKS') ? t.common.detected : t.common.safe}
          </span>
        </div>
      </div>
    </Card>
  );
};
