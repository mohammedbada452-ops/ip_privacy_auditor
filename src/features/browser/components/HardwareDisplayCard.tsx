import React from 'react';
import { Card, StatusBadge } from '../../../components/ui';
import { Monitor, Cpu, Maximize2, Smartphone } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { DisplayData, HardwareData, ProfileGroup } from '../types';

export interface HardwareDisplayCardProps {
  hardwareGroup: ProfileGroup<HardwareData>;
  displayGroup: ProfileGroup<DisplayData>;
}

export const HardwareDisplayCard: React.FC<HardwareDisplayCardProps> = ({
  hardwareGroup,
  displayGroup,
}) => {
  const { t } = useLanguage();
  const hw = hardwareGroup.data;
  const disp = displayGroup.data;

  const cpuCores = hw?.cpuCores ?? hw?.hardwareConcurrency ?? 8;
  const deviceMemory = hw?.deviceMemory ? `${hw.deviceMemory} GB` : '8+ GB';
  const screenResolution = disp ? `${disp.width} × ${disp.height}` : '1920 × 1080';
  const availableResolution = disp ? `${disp.availWidth} × ${disp.availHeight}` : '1920 × 1040';
  const dpr = disp?.devicePixelRatio ? `${disp.devicePixelRatio}x` : '2x';
  const colorDepth = disp?.colorDepth ? `${disp.colorDepth}-bit` : '24-bit';
  const touchPoints = hw?.maxTouchPoints ?? 0;

  return (
    <Card id="hardware" variant="standard" className="p-5 flex flex-col justify-between space-y-4 scroll-mt-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{t.browser.hardwareTitle}</h3>
            <p className="text-xs text-slate-400">{t.browser.hardwareSubtitle}</p>
          </div>
        </div>
        <StatusBadge status="warning" label="Exposed" size="sm" />
      </div>

      {/* Hardware Specifications Grid */}
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-slate-400 block text-[11px]">{t.browser.cpuCores}</span>
            <span className="font-mono text-slate-100 font-semibold">{cpuCores} Cores</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">{t.browser.deviceMemory}</span>
            <span className="font-mono text-slate-100 font-semibold">{deviceMemory}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900 grid grid-cols-2 gap-2">
          <div>
            <span className="text-slate-400 block text-[11px]">{t.browser.screenResolution}</span>
            <span className="font-mono text-slate-200">{screenResolution}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">{t.browser.availableResolution}</span>
            <span className="font-mono text-slate-200">{availableResolution}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900 grid grid-cols-3 gap-2">
          <div>
            <span className="text-slate-400 block text-[11px]">{t.browser.devicePixelRatio}</span>
            <span className="font-mono text-slate-200">{dpr}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">{t.browser.colorDepth}</span>
            <span className="font-mono text-slate-200">{colorDepth}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">{t.browser.touchPoints}</span>
            <span className="font-mono text-slate-200">{touchPoints}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
