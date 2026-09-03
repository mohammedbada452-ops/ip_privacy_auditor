import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Lock, Sparkles } from 'lucide-react';
import { Badge } from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { HeaderItem } from '../types';

export interface HeaderRowProps {
  item: HeaderItem;
}

export const HeaderRow: React.FC<HeaderRowProps> = ({ item }) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${item.canonicalName}: ${item.sanitizedValue}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    switch (item.privacyStatus) {
      case 'SAFE':
        return <Badge variant="success" size="sm">{t.headers.badgeSafe}</Badge>;
      case 'WARNING':
        return <Badge variant="warning" size="sm">{t.headers.badgeWarning}</Badge>;
      case 'DANGER':
        return <Badge variant="danger" size="sm">{t.headers.badgeDanger}</Badge>;
      case 'MASKED':
        return <Badge variant="neutral" size="sm" className="bg-purple-950/60 text-purple-300 border border-purple-800/40">{t.headers.badgeMasked}</Badge>;
      case 'INFO':
      default:
        return <Badge variant="neutral" size="sm">{t.headers.badgeInfo}</Badge>;
    }
  };

  const getCategoryLabel = () => {
    switch (item.category) {
      case 'IDENTITY_CLIENT_HINTS':
        return t.headers.catIdentityClientHints;
      case 'PRIVACY_TRACKING':
        return t.headers.catPrivacyTracking;
      case 'PROXY_NETWORK':
        return t.headers.catProxyNetwork;
      case 'SECURITY_TRANSPORT':
        return t.headers.catSecurityTransport;
      case 'CONTENT_NEGOTIATION':
        return t.headers.catContentNegotiation;
      case 'CACHING_STATE':
        return t.headers.catCachingState;
      case 'CUSTOM_ANOMALY':
      default:
        return t.headers.catCustomAnomaly;
    }
  };

  return (
    <div className="border-b border-slate-800/60 last:border-b-0 hover:bg-slate-900/40 transition-colors">
      {/* Primary Row Grid */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
        {/* Header Name (Col 1-4) */}
        <div className="lg:col-span-4 min-w-0">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls={`header-details-${item.category}-${item.canonicalName.replace(/[^a-zA-Z0-9_-]/g, '-')}`}
            aria-label={`${isExpanded ? t.common.collapse : t.common.expand} ${item.canonicalName}`}
            className="w-full min-w-0 flex items-center gap-2.5 text-start rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-inset px-1 py-1 hover:bg-slate-900/40 transition-colors"
          >
            <span
              aria-hidden="true"
              className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/70 transition-colors shrink-0"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold text-slate-200 break-all select-all">
                {item.canonicalName}
              </span>

              {item.isPrivacyControl && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
                  {t.headers.badgePrivacyControl}
                </span>
              )}
              {item.isClientHint && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
                  {t.headers.badgeClientHint}
                </span>
              )}
              {item.isProxyHeader && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800/50">
                  {t.headers.badgeProxy}
                </span>
              )}
              {item.isSensitive && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-950/80 text-purple-300 border border-purple-800/50 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  {t.headers.badgeRedacted}
                </span>
              )}
            </div>

            <span className="text-[11px] text-slate-500 font-sans block mt-0.5">
              {getCategoryLabel()}
            </span>
          </div>
          </button>
        </div>

        {/* Value Column (Col 5-8) */}
        <div className="lg:col-span-4 min-w-0">
          <div className="flex items-center gap-2">
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-300 truncate max-w-full flex-1 selection:bg-cyan-500/30">
              {item.sanitizedValue}
            </div>

            <button
              onClick={handleCopy}
              title={t.common.copy}
              className="w-10 h-10 inline-flex items-center justify-center bg-slate-800/60 hover:bg-slate-700/60 rounded-lg text-slate-400 hover:text-slate-200 transition-colors shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Privacy Status & Impact (Col 9-11) */}
        <div className="lg:col-span-3 flex items-center gap-2">
          {getStatusBadge()}
          <span className="text-xs text-slate-400 font-sans truncate">
            {item.privacyImpact}
          </span>
        </div>

        {/* Points Column (Col 12) */}
        <div className="lg:col-span-1 flex justify-end">
          {item.riskPoints > 0 ? (
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-full">
              -{item.riskPoints}
            </span>
          ) : item.isPrivacyControl ? (
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
              +0
            </span>
          ) : (
            <span className="text-xs font-mono text-slate-500">
              0
            </span>
          )}
        </div>
      </div>

      {/* Expanded Deep Inspection Drawer */}
      {isExpanded && (
        <div id={`header-details-${item.category}-${item.canonicalName.replace(/[^a-zA-Z0-9_-]/g, '-')}`} className="px-6 py-4 bg-slate-950/70 border-t border-slate-800/60 text-xs space-y-3">
          {/* Header Description */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              {t.headers.technicalDescription}
            </span>
            <p className="text-slate-300 font-sans leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Privacy & Fingerprinting Impact */}
          <div>
            <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider block mb-1">
              {t.headers.privacyEntropyImpact}
            </span>
            <p className="text-slate-300 font-sans leading-relaxed">
              {item.privacyImpact}
            </p>
          </div>

          {/* Actionable Recommendation */}
          {item.recommendation && (
            <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-lg p-3 text-cyan-200 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-cyan-300 block mb-0.5">
                  {t.headers.privacyRecommendation}
                </span>
                <span className="text-slate-300 font-sans">{item.recommendation}</span>
              </div>
            </div>
          )}

          {/* Monospace Raw Header Line */}
          <div className="pt-1">
            <span className="text-[11px] font-mono text-slate-500 block mb-1">
              {t.headers.httpWireLine}
            </span>
            <code className="block bg-slate-900 border border-slate-800 p-2 rounded font-mono text-slate-200 select-all overflow-x-auto">
              {item.canonicalName}: {item.sanitizedValue}
            </code>
          </div>
        </div>
      )}
    </div>
  );
};
