import React from 'react';
import { Network } from 'lucide-react';
import { Card, CardHeader, CardBody, DataRow, MonoValue, CodeValue } from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { IpDetailsResponse } from '@packages/api-contract';

export interface AsnIspCardProps {
  details: IpDetailsResponse;
}

export const AsnIspCard: React.FC<AsnIspCardProps> = ({ details }) => {
  const { t } = useLanguage();
  const { network } = details;

  return (
    <Card variant="standard" className="h-full">
      <CardHeader
        icon={<Network className="w-5 h-5 text-cyan-400" />}
        title={t.ip.asnTitle}
        subtitle={t.ip.asnSubtitle}
      />
      <CardBody>
        <div className="space-y-1">
          <DataRow
            label={t.ip.isp}
            value={<MonoValue>{network.isp || '—'}</MonoValue>}
          />
          <DataRow
            label={t.ip.organization}
            value={<MonoValue>{network.organization || '—'}</MonoValue>}
          />
          <DataRow
            label={t.ip.asnIdentifier}
            value={
              network.asn && network.asn !== 'AS0' && network.asn !== '—' ? (
                <CodeValue>{network.asn}</CodeValue>
              ) : (
                <span className="text-slate-500 font-mono text-xs">{t.ip.notAssigned}</span>
              )
            }
          />
          <DataRow
            label={t.ip.mobileNetwork}
            value={
              <span className={`font-mono text-xs ${network.isMobile ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}>
                {network.isMobile ? t.ip.cellularCarrier : t.ip.notDetectedSafe}
              </span>
            }
          />
        </div>
      </CardBody>
    </Card>
  );
};
