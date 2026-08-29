import React from 'react';
import { Terminal } from 'lucide-react';
import { Card, CardHeader, CardBody, CodeValue, StatusBadge, DataRow, MonoValue } from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { IpCheckResponse } from '@packages/api-contract';

export interface HeadersPreviewCardProps {
  check: IpCheckResponse;
}

export const HeadersPreviewCard: React.FC<HeadersPreviewCardProps> = ({ check }) => {
  const { t } = useLanguage();
  const { headers, connectionFlags } = check;

  return (
    <Card variant="standard" className="h-full">
      <CardHeader
        icon={<Terminal className="w-5 h-5 text-cyan-400" />}
        title={t.ip.headersTitle}
        subtitle={t.ip.headersSubtitle}
      />
      <CardBody className="space-y-4">
        <div className="space-y-1">
          <DataRow
            label={t.ip.proxyHeadersDetected}
            value={
              <StatusBadge
                status={connectionFlags.hasProxyHeaders ? 'warning' : 'success'}
                label={
                  connectionFlags.hasProxyHeaders
                    ? t.ip.proxyHeadersPresent
                    : t.ip.noProxyHeaders
                }
              />
            }
          />
          {connectionFlags.viaHeader && (
            <DataRow
              label={t.ip.viaHeader}
              value={<CodeValue>{connectionFlags.viaHeader}</CodeValue>}
            />
          )}
          <DataRow
            label={t.ip.secGpc}
            value={
              headers.secGpc === '1' ? (
                <StatusBadge status="success" label={t.ip.activeOne} />
              ) : (
                <StatusBadge status="neutral" label={t.ip.notSet} />
              )
            }
          />
          <DataRow
            label={t.ip.dnt}
            value={
              headers.dnt === '1' ? (
                <StatusBadge status="success" label={t.ip.activeOne} />
              ) : (
                <StatusBadge status="neutral" label={t.ip.notSet} />
              )
            }
          />
          <DataRow
            label={t.ip.acceptLanguage}
            value={
              headers.acceptLanguage ? (
                <MonoValue className="text-[11px] truncate max-w-[200px] sm:max-w-[280px]">
                  {headers.acceptLanguage}
                </MonoValue>
              ) : (
                '—'
              )
            }
          />
          <DataRow
            label={t.ip.userAgent}
            value={
              headers.userAgent ? (
                <MonoValue className="text-[11px] truncate max-w-[200px] sm:max-w-[280px]">
                  {headers.userAgent}
                </MonoValue>
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
