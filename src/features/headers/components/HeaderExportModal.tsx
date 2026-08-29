import React, { useState } from 'react';
import { X, Copy, Check, FileJson, FileText, Download, Printer, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { HeadersAnalysisResponse } from '../types';

export interface HeaderExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: HeadersAnalysisResponse | null;
}

export const HeaderExportModal: React.FC<HeaderExportModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const { t, formatNumber } = useLanguage();
  const [activeTab, setActiveTab] = useState<'json' | 'raw' | 'report'>('json');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !data) return null;

  // Comprehensive JSON export object
  const fullAuditJson = {
    reportType: 'HTTP_REQUEST_HEADERS_PRIVACY_AUDIT',
    timestamp: new Date().toISOString(),
    privacyScore: data.headerPrivacyExposureScore,
    privacyTier: data.privacyTier,
    scoreFactors: data.scoreFactors,
    summary: data.summary,
    problems: data.problems,
    clientHintsAnalysis: data.clientHintsAnalysis,
    cookieSecurity: data.cookieSecurity,
    missingHeaders: data.missingHeaders,
    headers: data.headers.map((h) => ({
      name: h.name,
      canonicalName: h.canonicalName,
      category: h.category,
      sanitizedValue: h.sanitizedValue,
      privacyStatus: h.privacyStatus,
      severity: h.severity,
      riskPoints: h.riskPoints,
      description: h.description,
      privacyImpact: h.privacyImpact,
      recommendation: h.recommendation,
    })),
    rawHttp: data.rawExport.rawHttp,
  };

  const jsonString = JSON.stringify(fullAuditJson, null, 2);
  const rawString = data.rawExport.rawHttp;
  const currentContent = activeTab === 'json' ? jsonString : rawString;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename =
      activeTab === 'json'
        ? `http_headers_audit_${Date.now()}.json`
        : `http_headers_raw_${Date.now()}.txt`;
    const mimeType = activeTab === 'json' ? 'application/json' : 'text/plain';
    const blob = new Blob([currentContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden print:max-w-none print:max-h-none print:border-none print:shadow-none print:bg-white">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {t.headers.exportModalTitle}
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                {t.headers.exportModalSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.ui.closeDialog}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="px-5 pt-3 pb-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 bg-slate-950/40 print:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>{t.headers.exportJsonTab}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('raw')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'raw'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t.headers.exportRawTab}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('report')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.headers.exportPdfTab}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'report' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrint}
                leftIcon={<Printer className="w-3.5 h-3.5" />}
              >
                {t.headers.exportPrintBtn}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  {t.headers.exportDownload}
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCopy}
                  leftIcon={
                    copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )
                  }
                >
                  {copied ? t.common.copied : t.headers.exportCopy}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 p-5 overflow-y-auto bg-slate-950/80 print:bg-white print:text-black">
          {activeTab === 'report' ? (
            <div className="space-y-6 text-slate-200 print:text-black font-sans text-xs">
              {/* Report Header */}
              <div className="pb-4 border-b border-slate-800 print:border-black flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-100 print:text-black">
                    {t.headers.exportReportTitle}
                  </h2>
                  <p className="text-slate-400 print:text-gray-600">
                    Generated: {new Date().toUTCString()}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <div className="text-2xl font-black text-cyan-400 print:text-black">
                    {data.headerPrivacyExposureScore} / 100
                  </div>
                  <Badge variant="info" size="sm">
                    {data.privacyTier}
                  </Badge>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 print:border print:border-black p-3 rounded-lg bg-slate-900/60 print:bg-gray-100">
                <div>
                  <span className="text-slate-400 print:text-gray-600 uppercase text-[10px]">{t.ui.totalHeadersLabel}:</span>
                  <div className="font-mono font-bold text-sm text-slate-100 print:text-black">{data.summary.totalReceived}</div>
                </div>
                <div>
                  <span className="text-slate-400 print:text-gray-600 uppercase text-[10px]">{t.ui.clientHintsLabel}:</span>
                  <div className="font-mono font-bold text-sm text-slate-100 print:text-black">{data.summary.clientHintsCount}</div>
                </div>
                <div>
                  <span className="text-slate-400 print:text-gray-600 uppercase text-[10px]">{t.ui.maskedHeadersLabel}:</span>
                  <div className="font-mono font-bold text-sm text-slate-100 print:text-black">{data.summary.sensitiveMaskedCount}</div>
                </div>
              </div>

              {/* Observed Headers Table */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-100 print:text-black">
                  {t.ui.receivedHttpHeadersWithCount.replace('{count}', String(data.headers.length))}
                </h4>
                <div className="border border-slate-800 print:border-black rounded-lg overflow-hidden">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-900 print:bg-gray-200 border-b border-slate-800 print:border-black">
                      <tr>
                        <th className="p-2">{t.headers.tableHeaderNameCategory}</th>
                        <th className="p-2">{t.headers.tableReceivedValue}</th>
                        <th className="p-2">{t.common.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 print:divide-black">
                      {data.headers.map((h) => (
                        <tr key={h.canonicalName} className="hover:bg-slate-900/40">
                          <td className="p-2 font-bold text-cyan-300 print:text-black">{h.canonicalName}</td>
                          <td className="p-2 text-slate-300 print:text-gray-800 break-all">{h.sanitizedValue}</td>
                          <td className="p-2 text-slate-400 print:text-black">{h.privacyStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <pre className="text-xs font-mono text-cyan-300/90 whitespace-pre-wrap break-all select-all leading-relaxed" dir="ltr">
              {currentContent}
            </pre>
          )}
        </div>

        {/* Footer Note */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 font-sans flex items-center justify-between print:hidden">
          <span>{t.headers.exportRedactionNote}</span>
          <span className="font-mono text-slate-400">
            {formatNumber(data.headers.length)} {t.headers.exportHeaderCount}
          </span>
        </div>
      </div>
    </div>
  );
};
