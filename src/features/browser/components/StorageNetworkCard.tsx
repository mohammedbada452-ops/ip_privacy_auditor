import React from 'react';
import { Card, StatusBadge } from '../../../components/ui';
import { HardDrive, Wifi, Database } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { StorageData, NetworkData, ProfileGroup } from '../types';

export interface StorageNetworkCardProps {
  storageGroup: ProfileGroup<StorageData>;
  networkGroup: ProfileGroup<NetworkData>;
}

export const StorageNetworkCard: React.FC<StorageNetworkCardProps> = ({
  storageGroup,
  networkGroup,
}) => {
  const { t } = useLanguage();
  const st = storageGroup.data;
  const net = networkGroup.data;

  const cookies = st?.cookiesEnabled ?? true;
  const localStorage = st?.localStorageAvailable ?? true;
  const sessionStorage = st?.sessionStorageAvailable ?? true;
  const indexedDb = st?.indexedDbAvailable ?? true;

  const effectiveType = net?.effectiveType || '4g';
  const rtt = net?.rtt ? `${net.rtt}ms` : '50ms';
  const downlink = net?.downlink ? `${net.downlink} Mbps` : '10 Mbps';

  return (
    <Card id="storage" variant="standard" className="p-5 flex flex-col justify-between space-y-4 scroll-mt-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{t.browser.storageNetworkTitle}</h3>
            <p className="text-xs text-slate-400">{t.browser.storageNetworkSubtitle}</p>
          </div>
        </div>
        <StatusBadge status="neutral" label="Available" size="sm" />
      </div>

      {/* Storage & Network Details */}
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-slate-400 block text-[11px]">{t.browser.cookiesStatus}</span>
            <span className="font-mono text-slate-200">
              {cookies ? 'Enabled (Persistent)' : 'Disabled'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">{t.browser.localStorageStatus}</span>
            <span className="font-mono text-slate-200">{localStorage ? 'Available' : 'Restricted'}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900 grid grid-cols-2 gap-2">
          <div>
            <span className="text-slate-400 block text-[11px]">{t.browser.sessionStorageStatus}</span>
            <span className="font-mono text-slate-200">{sessionStorage ? 'Available' : 'Restricted'}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">{t.browser.indexedDbStatus}</span>
            <span className="font-mono text-slate-200">{indexedDb ? 'Available' : 'Restricted'}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900 grid grid-cols-2 gap-2">
          <div>
            <span className="text-slate-400 block text-[11px]">{t.browser.effectiveNetwork}</span>
            <span className="font-mono text-cyan-400 uppercase font-semibold">
              {effectiveType}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">{t.browser.rttDownlink}</span>
            <span className="font-mono text-slate-200">
              {rtt} / {downlink}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
