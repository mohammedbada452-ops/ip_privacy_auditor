import React from 'react';
import { Globe2, Network, ShieldCheck, Server } from 'lucide-react';
import { Card, CardHeader, CardBody, DataRow, StatusBadge } from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { IpNetworkIntelligenceResponse } from '@packages/api-contract';

export const NetworkIntelligenceCard: React.FC<{ data: IpNetworkIntelligenceResponse }> = ({ data }) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const confidenceStatus = data.intelligenceConfidence === 'HIGH' ? 'success' as const : data.intelligenceConfidence === 'MEDIUM' ? 'warning' as const : 'neutral' as const;
  const confidenceLabel = ar
    ? ({ HIGH: 'عالية', MEDIUM: 'متوسطة', LOW: 'منخفضة', UNKNOWN: 'غير معروفة' } as const)[data.intelligenceConfidence]
    : data.intelligenceConfidence;
  return (
    <Card variant="standard" className="h-full">
      <CardHeader
        icon={<Globe2 className="w-5 h-5 text-violet-400" />}
        title={ar ? 'ذكاء الشبكة الموسّع' : 'Extended Network Intelligence'}
        subtitle={ar ? 'مصادر تسجيل وDNS وسمعة مستقلة دون تغيير درجة الخصوصية' : 'Independent registry, DNS, and reputation signals; canonical privacy score unchanged'}
      />
      <CardBody>
        <div className="space-y-1">
          <DataRow label={ar ? 'ثقة التجميع' : 'Intelligence confidence'} value={<StatusBadge status={confidenceStatus} label={confidenceLabel} />} />
          <DataRow label={ar ? 'سجل RDAP' : 'RDAP network'} value={data.rdap.name || data.rdap.handle || '—'} />
          <DataRow label={ar ? 'النطاق' : 'CIDR'} value={data.rdap.cidr || '—'} />
          <DataRow label={ar ? 'DNS عكسي' : 'Reverse DNS'} value={data.reverseDns.names[0] || (data.reverseDns.status === 'UNAVAILABLE' ? (ar ? 'لا يوجد PTR' : 'No PTR record') : '—')} />
          <DataRow label={ar ? 'DNSSEC' : 'DNSSEC'} value={data.reverseDns.dnssecValidated === null ? '—' : data.reverseDns.dnssecValidated ? 'VALIDATED' : 'NOT VALIDATED'} />
          <DataRow label={ar ? 'المصادر' : 'Sources'} value={String(data.providers.length)} />
          <DataRow label={ar ? 'اتفاق المصادر' : 'Provider agreement'} value={data.consensus?.agreement || 'NONE'} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-slate-400">
          <div className="rounded-lg border border-slate-800 p-2"><Network className="h-4 w-4 mb-1" />RDAP</div>
          <div className="rounded-lg border border-slate-800 p-2"><Server className="h-4 w-4 mb-1" />DNS</div>
          <div className="rounded-lg border border-slate-800 p-2"><ShieldCheck className="h-4 w-4 mb-1" />Reputation</div>
        </div>
        <p className="mt-4 text-xs text-slate-500 leading-5">{data.note}</p>
        {data.providerObservations?.length ? (
          <div className="mt-4 rounded-lg border border-slate-800/80 bg-slate-950/35 p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-600 mb-2">{ar ? 'مراقبات المزودين' : 'Provider observations'}</div>
            <div className="space-y-1.5">
              {data.providerObservations.map((observation) => (
                <div key={observation.provider} className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-slate-400">{observation.provider}</span>
                  <span className={observation.status === 'VERIFIED' ? 'text-emerald-400' : 'text-slate-500'}>{observation.status}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {data.providers.some((provider) => provider === 'IPinfo Lite') ? (
          <p className="mt-2 text-[10px] text-slate-600">IPinfo Lite attribution: country and basic ASN data.</p>
        ) : null}
      </CardBody>
    </Card>
  );
};
