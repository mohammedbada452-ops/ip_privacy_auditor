import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Card, CardHeader, CardBody, DataRow, StatusBadge } from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { IpReputationResponse } from '@packages/api-contract';

export interface IpReputationCardProps {
  reputation: IpReputationResponse;
}

export const IpReputationCard: React.FC<IpReputationCardProps> = ({ reputation }) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const title = ar ? 'سمعة عنوان IP' : 'IP Reputation';
  const subtitle = ar ? 'مؤشرات إساءة الاستخدام الخارجية — لا تغيّر درجة الخصوصية الأساسية' : 'External abuse intelligence — does not change the canonical privacy score';
  const unavailable = ar ? 'غير متاح' : 'Unavailable';
  const measured = ar ? 'تم القياس' : 'Measured';
  const error = ar ? 'غير متاح مؤقتًا' : 'Temporarily unavailable';
  const scoreLabel = ar ? 'مؤشر إساءة الاستخدام' : 'Abuse confidence';
  const reportsLabel = ar ? 'عدد البلاغات' : 'Reports';
  const usageLabel = ar ? 'نوع الاستخدام' : 'Usage type';
  const providerLabel = ar ? 'المصدر' : 'Provider';

  const score = reputation.abuseConfidenceScore;
  const status = reputation.status === 'MEASURED'
    ? { status: score !== null && score >= 80 ? 'danger' as const : score !== null && score >= 20 ? 'warning' as const : 'success' as const, label: measured }
    : reputation.status === 'ERROR'
      ? { status: 'warning' as const, label: error }
      : { status: 'neutral' as const, label: unavailable };

  return (
    <Card variant="standard" className="h-full">
      <CardHeader
        icon={<ShieldAlert className="w-5 h-5 text-cyan-400" />}
        title={title}
        subtitle={subtitle}
      />
      <CardBody>
        <div className="space-y-1">
          <DataRow label={status.status === 'success' || status.status === 'warning' || status.status === 'danger' ? scoreLabel : providerLabel} value={<StatusBadge status={status.status} label={status.label} />} />
          <DataRow label={scoreLabel} value={score === null ? '—' : `${score}/100`} />
          <DataRow label={reportsLabel} value={reputation.totalReports === null ? '—' : String(reputation.totalReports)} />
          <DataRow label={usageLabel} value={reputation.usageType || '—'} />
          <DataRow label={providerLabel} value={reputation.provider || '—'} />
        </div>
        <p className="mt-4 text-xs text-slate-500 leading-5">{reputation.note}</p>
      </CardBody>
    </Card>
  );
};
