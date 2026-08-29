import React from 'react';
import { Search, AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';

export interface BrowserSearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  warningsOnly: boolean;
  onWarningsOnlyToggle: () => void;
}

export const BrowserSearchFilter: React.FC<BrowserSearchFilterProps> = ({
  searchQuery,
  onSearchChange,
  warningsOnly,
  onWarningsOnlyToggle,
}) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.browser.searchPlaceholder}
          className="w-full pl-9 pr-9 py-2 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Warnings / Exposures Only Toggle */}
      <button
        onClick={onWarningsOnlyToggle}
        className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
          warningsOnly
            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
        }`}
      >
        <AlertTriangle className={`w-3.5 h-3.5 ${warningsOnly ? 'text-amber-400' : 'text-slate-500'}`} />
        <span>{t.browser.warningsOnly}</span>
      </button>
    </div>
  );
};
