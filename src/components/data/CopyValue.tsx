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
    <div className={`inline-flex min-w-0 items-center gap-1.5 max-w-full ${className}`}>
      {label && <span className="text-xs text-slate-400 font-medium shrink-0">{label}:</span>}
      <span
        className={`min-w-0 max-w-[min(100%,22rem)] sm:max-w-[28rem] px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 truncate ${
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
        className="min-w-10 min-h-10 p-2 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 border border-slate-700/60 transition-colors shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
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
