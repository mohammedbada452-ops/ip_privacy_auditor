import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export interface CopyValueProps {
  value: string;
  displayValue?: string;
  isMono?: boolean;
  className?: string;
  label?: string;
}

export const CopyValue: React.FC<CopyValueProps> = ({
  value,
  displayValue,
  isMono = true,
  className = '',
  label,
}) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className={`flex w-full min-w-0 items-center gap-2 ${className}`} dir="ltr">
      {label && <span className="shrink-0 text-xs text-slate-400 font-medium">{label}:</span>}
      <span
        className={`technical-value min-w-0 flex-1 px-2 py-2 bg-slate-950 border border-slate-800 rounded text-xs sm:text-sm text-slate-200 whitespace-nowrap overflow-x-auto overflow-y-hidden select-all ${
          isMono ? 'font-mono text-cyan-300' : 'font-sans'
        }`}
        title={value}
      >
        {displayValue || value}
      </span>
      <button
        onClick={handleCopy}
        aria-label={t.common.copyToClipboard}
        title={copied ? t.common.copied : t.common.copyToClipboard}
        className="min-w-10 min-h-10 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 border border-slate-700/60 transition-colors shrink-0 cursor-pointer inline-flex items-center justify-center"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
};
