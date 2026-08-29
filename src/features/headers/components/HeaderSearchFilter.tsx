import React from 'react';
import { Search, X } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { HeaderSortField, HeaderSortOrder } from '../types';

export interface HeaderSearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortField: HeaderSortField;
  onSortFieldChange: (field: HeaderSortField) => void;
  sortOrder: HeaderSortOrder;
  onSortOrderToggle: () => void;
  showOnlyRisks: boolean;
  onToggleShowOnlyRisks: (val: boolean) => void;
  totalFilteredCount: number;
  totalAvailableCount: number;
}

export const HeaderSearchFilter: React.FC<HeaderSearchFilterProps> = ({
  searchQuery,
  onSearchChange,
  sortField,
  onSortFieldChange,
  sortOrder,
  onSortOrderToggle,
  showOnlyRisks,
  onToggleShowOnlyRisks,
  totalFilteredCount,
  totalAvailableCount,
}) => {
  const { t, formatNumber } = useLanguage();

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      {/* Search Input */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-slate-500">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.headers.searchPlaceholder}
          className="w-full bg-slate-950/80 border border-slate-800 rounded-lg ps-9 pe-8 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
        />
        {searchQuery.length > 0 && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-500 hover:text-slate-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Controls Group */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Risk Only Toggle */}
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/80 hover:border-slate-700 transition-colors">
          <input
            type="checkbox"
            checked={showOnlyRisks}
            onChange={(e) => onToggleShowOnlyRisks(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/30 w-3.5 h-3.5"
          />
          <span>{t.headers.warningsOnly}</span>
        </label>

        {/* Sort Field Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800/80">
          <select
            value={sortField}
            onChange={(e) => onSortFieldChange(e.target.value as HeaderSortField)}
            className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer py-1"
          >
            <option value="default" className="bg-slate-900 text-slate-200">
              {t.headers.sortDefault}
            </option>
            <option value="name" className="bg-slate-900 text-slate-200">
              {t.headers.sortName}
            </option>
            <option value="severity" className="bg-slate-900 text-slate-200">
              {t.headers.sortSeverity}
            </option>
            <option value="status" className="bg-slate-900 text-slate-200">
              {t.headers.sortStatus}
            </option>
          </select>

          <button
            onClick={onSortOrderToggle}
            className="p-1 text-slate-400 hover:text-slate-200 font-mono text-[10px] font-bold uppercase transition-colors"
            title={t.common.sortBy}
          >
            {sortOrder === 'asc' ? '▲ ASC' : '▼ DESC'}
          </button>
        </div>

        {/* Counter Badge */}
        <div className="text-[11px] font-mono text-slate-500 px-2">
          {formatNumber(totalFilteredCount)} / {formatNumber(totalAvailableCount)}
        </div>
      </div>
    </div>
  );
};
