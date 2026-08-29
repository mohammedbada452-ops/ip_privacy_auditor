import React from 'react';
import { Card, EmptyState } from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import { HeaderRow } from './HeaderRow';
import type { HeaderItem } from '../types';

export interface HeaderTableProps {
  headers: HeaderItem[];
  searchQuery: string;
}

export const HeaderTable: React.FC<HeaderTableProps> = ({ headers, searchQuery }) => {
  const { t } = useLanguage();

  if (headers.length === 0) {
    return (
      <Card variant="standard" className="p-8 text-center bg-slate-900/40 border-slate-800/80">
        <EmptyState
          title={t.headers.noHeadersMatch}
          description={
            searchQuery
              ? `${t.headers.noHeadersQueryMatch}`
              : t.headers.noHeadersInCategory
          }
        />
      </Card>
    );
  }

  return (
    <Card variant="standard" className="border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-xl">
      {/* Table Header (Desktop) */}
      <div className="hidden lg:grid grid-cols-12 gap-3 px-6 py-3 bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
        <div className="col-span-4">{t.headers.tableHeaderNameCategory}</div>
        <div className="col-span-4">{t.headers.tableReceivedValue}</div>
        <div className="col-span-3">{t.headers.tablePrivacyAssessment}</div>
        <div className="col-span-1 text-end">{t.headers.tableImpact}</div>
      </div>

      {/* Rows List */}
      <div className="divide-y divide-slate-800/60">
        {headers.map((item) => (
          <HeaderRow key={`${item.category}-${item.canonicalName}`} item={item} />
        ))}
      </div>
    </Card>
  );
};
