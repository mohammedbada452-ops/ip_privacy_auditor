import React from 'react';
import { MapPin, Clock } from 'lucide-react';
import { Card, CardHeader, CardBody, DataRow, MonoValue } from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { IpDetailsResponse, IpNetworkIntelligenceResponse } from '@packages/api-contract';

export interface GeoNetworkCardProps {
  details: IpDetailsResponse;
  networkIntelligence?: IpNetworkIntelligenceResponse;
}

export const GeoNetworkCard: React.FC<GeoNetworkCardProps> = ({ details, networkIntelligence }) => {
  const { t } = useLanguage();
  const { geo } = details;
  const countryEvidence = geo.evidenceConfidence?.country || 'UNKNOWN';
  const evidenceLabel = countryEvidence === 'HIGH' ? t.common.high : countryEvidence === 'MEDIUM' ? t.common.medium : countryEvidence === 'LOW' ? t.common.low : t.common.unknown;
  const agreement = networkIntelligence?.consensus?.countryAgreement;
  const agreementLabel = agreement === 'HIGH' ? t.common.high : agreement === 'MEDIUM' ? t.common.medium : agreement === 'LOW' ? t.common.low : agreement === 'UNKNOWN' ? t.common.unknown : null;

  return (
    <Card variant="standard" className="h-full">
      <CardHeader
        icon={<MapPin className="w-5 h-5 text-cyan-400" />}
        title={t.ip.geoTitle}
        subtitle={t.ip.geoSubtitle}
      />
      <CardBody>
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-slate-800/70 bg-slate-950/25 px-3 py-2 text-[10px]">
          <span className="text-slate-500">{t.ip.geoEvidenceQuality}</span>
          <span className={countryEvidence === 'HIGH' ? 'text-emerald-400' : countryEvidence === 'LOW' ? 'text-amber-400' : 'text-slate-400'}>
            {evidenceLabel}{agreementLabel ? ` · ${agreementLabel}` : ''}
          </span>
        </div>
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

        {networkIntelligence?.providerObservations && (() => {
          const countries = Array.from(new Set(networkIntelligence.providerObservations.map((o) => o.countryCode).filter((c): c is string => Boolean(c))));
          const hasConflict = countries.length > 1;
          return (
            <div className="mt-4 rounded-lg border border-slate-800/80 bg-slate-950/30 p-3">
              <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-wider">
                <span className="text-slate-500">{hasConflict ? t.ip.geoSourceConflict : t.ip.sourceAgreement}</span>
                <span className={hasConflict ? 'text-amber-400' : 'text-emerald-400'}>{networkIntelligence.consensus?.agreement || 'NONE'}</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {networkIntelligence.providerObservations.map((observation) => (
                  <div key={`${observation.provider}-${observation.countryCode || 'none'}`} className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-slate-400">{observation.provider}</span>
                    <span className="font-mono text-slate-300">{observation.countryCode || '—'}{observation.country ? ` · ${observation.country}` : ''}</span>
                  </div>
                ))}
              </div>
              {hasConflict && (
                <p className="mt-2 text-[10px] leading-4 text-slate-500">{t.ip.networkGeolocation}: {t.ip.geoSourceConflict}. {t.ip.geoSourceConflictNote}</p>
              )}
            </div>
          );
        })()}
      </CardBody>
    </Card>
  );
};
