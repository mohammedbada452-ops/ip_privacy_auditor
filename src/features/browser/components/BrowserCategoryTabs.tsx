import React from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import {
  Layers,
  Palette,
  Radio,
  Cpu,
  Bot,
  Globe,
} from 'lucide-react';

export type BrowserTabCategory =
  | 'ALL'
  | 'GRAPHICS'
  | 'NETWORK'
  | 'HARDWARE'
  | 'AUTOMATION'
  | 'IDENTITY';

export interface BrowserCategoryTabsProps {
  activeTab: BrowserTabCategory;
  onTabChange: (tab: BrowserTabCategory) => void;
}

export const BrowserCategoryTabs: React.FC<BrowserCategoryTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { t } = useLanguage();

  const tabs: { id: BrowserTabCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'ALL', label: t.browser.tabAll, icon: <Layers className="w-4 h-4" /> },
    { id: 'GRAPHICS', label: t.browser.tabGraphics, icon: <Palette className="w-4 h-4" /> },
    { id: 'NETWORK', label: t.browser.tabNetwork, icon: <Radio className="w-4 h-4" /> },
    { id: 'HARDWARE', label: t.browser.tabHardware, icon: <Cpu className="w-4 h-4" /> },
    { id: 'AUTOMATION', label: t.browser.tabAutomation, icon: <Bot className="w-4 h-4" /> },
    { id: 'IDENTITY', label: t.browser.tabIdentity, icon: <Globe className="w-4 h-4" /> },
  ];

  return (
    <div role="tablist" aria-label={t.ui.browserSignal} className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-2 px-0.5 -mx-0.5 scrollbar-none border-b border-slate-800/80">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                const next = tabs[(tabs.findIndex((candidate) => candidate.id === tab.id) + 1) % tabs.length];
                onTabChange(next.id);
              }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                const index = tabs.findIndex((candidate) => candidate.id === tab.id);
                const prev = tabs[(index - 1 + tabs.length) % tabs.length];
                onTabChange(prev.id);
              }
            }}
            className={`flex min-h-10 items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
              isActive
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
