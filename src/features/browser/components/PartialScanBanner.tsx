/**
 * PartialScanBanner Component
 * Shows a subtle, informative alert when one or more collectors timed out or encountered restrictions.
 */

import React from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import { AlertCircle } from 'lucide-react';

interface PartialScanBannerProps {
  failedCollectors: string[];
}

export const PartialScanBanner: React.FC<PartialScanBannerProps> = ({ failedCollectors }) => {
  const { t } = useLanguage();

  if (!failedCollectors || failedCollectors.length === 0) return null;

  return (
    <div
      id="browser-partial-scan-banner"
      className="p-3.5 mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-3"
      role="alert"
    >
      <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
      <div>
        <p className="font-semibold text-amber-200">{t.browser.partialScanWarning}</p>
        <p className="mt-1 text-amber-300/80">
          Affected collectors: <span className="font-mono">{failedCollectors.join(', ')}</span>. Other diagnostic
          signals remain verified.
        </p>
      </div>
    </div>
  );
};
