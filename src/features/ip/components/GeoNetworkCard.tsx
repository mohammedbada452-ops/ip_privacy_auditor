import React from 'react';
import { MapPin, Clock } from 'lucide-react';
import { Card, CardHeader, CardBody, DataRow, MonoValue } from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { IpDetailsResponse } from '@packages/api-contract';

export interface GeoNetworkCardProps {
  details: IpDetailsResponse;
}

export const GeoNetworkCard: React.FC<GeoNetworkCardProps> = ({ details }) => {
  const { t } = useLanguage();
  const { geo } = details;

  return (
    <Card variant="standard" className="h-full">
      <CardHeader
        icon={<MapPin className="w-5 h-5 text-cyan-400" />}
        title={t.ip.geoTitle}
        subtitle={t.ip.geoSubtitle}
      />
      <CardBody>
        <div className="space-y-1">
          <DataRow
            label={t.ip.country}
            value={
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-200">
                  {geo.country} {geo.countryCode !== 'XX' && geo.countryCode !== 'LOCAL' ? `(${geo.countryCode})` : ''}
                </span>
              </div>
            }
          />
          <DataRow
            label={t.ip.region}
            value={<MonoValue>{geo.region || '—'}</MonoValue>}
          />
          <DataRow
            label={t.ip.city}
            value={<MonoValue>{geo.city || '—'}</MonoValue>}
          />
          <DataRow
            label={t.ip.postalCode}
            value={<MonoValue>{geo.postalCode || '—'}</MonoValue>}
          />
          <DataRow
            label={t.ip.coordinates}
            value={
              geo.latitude && geo.longitude ? (
                <MonoValue className="text-cyan-400">
                  {geo.latitude.toFixed(4)}, {geo.longitude.toFixed(4)}
                </MonoValue>
              ) : (
                '—'
              )
            }
          />
          <DataRow
            label={t.ip.timezone}
            value={
              geo.timezone ? (
                <div className="flex items-center gap-1.5 font-mono text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{geo.timezone}</span>
                </div>
              ) : (
                '—'
              )
            }
          />
        </div>
      </CardBody>
    </Card>
  );
};
