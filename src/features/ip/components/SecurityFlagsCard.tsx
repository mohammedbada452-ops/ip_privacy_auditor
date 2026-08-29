import React from 'react';
import { Shield } from 'lucide-react';
import { Card, CardHeader, CardBody, StatusBadge, DataRow } from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { IpDetailsResponse } from '@packages/api-contract';

export interface SecurityFlagsCardProps {
  details: IpDetailsResponse;
}

export const SecurityFlagsCard: React.FC<SecurityFlagsCardProps> = ({ details }) => {
  const { t } = useLanguage();
  const { network } = details;

  const getStatusProps = (isDetected: boolean | null) => {
    if (isDetected === null) {
      return {
        status: 'neutral' as const,
        label: t.ui.unavailable,
      };
    }
    if (isDetected) {
      return {
        status: 'warning' as const,
        label: t.ip.detectedActive,
      };
    }
    return {
      status: 'success' as const,
      label: t.ip.notDetectedSafe,
    };
  };

  return (
    <Card variant="standard" className="h-full">
      <CardHeader
        icon={<Shield className="w-5 h-5 text-cyan-400" />}
        title={t.ip.securityTitle}
        subtitle={t.ip.securitySubtitle}
      />
      <CardBody>
        <div className="space-y-1">
          <DataRow
            label={t.ip.proxyServer}
            value={
              <StatusBadge
                status={getStatusProps(network.isProxy).status}
                label={getStatusProps(network.isProxy).label}
              />
            }
          />
          <DataRow
            label={t.ip.vpnConnection}
            value={
              <StatusBadge
                status={getStatusProps(network.isVpn).status}
                label={getStatusProps(network.isVpn).label}
              />
            }
          />
          <DataRow
            label={t.ip.torExitNode}
            value={
              <StatusBadge
                status={network.isTor ? 'danger' : 'success'}
                label={network.isTor ? t.ip.torNodeDanger : t.ip.notDetectedSafe}
              />
            }
          />
          <DataRow
            label={t.ip.datacenterHosting}
            value={
              <StatusBadge
                status={network.isHosting ? 'info' : 'neutral'}
                label={network.isHosting ? t.ip.datacenterBadge : t.ip.notDetectedSafe}
              />
            }
          />
          <DataRow
            label={t.ip.cellularData}
            value={
              <StatusBadge
                status={network.isMobile ? 'info' : 'neutral'}
                label={network.isMobile ? t.ip.cellularCarrier : t.ip.notDetectedSafe}
              />
            }
          />
        </div>
      </CardBody>
    </Card>
  );
};
