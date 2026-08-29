import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useBrowserIntelligence } from '../hooks/useBrowserIntelligence';
import { useLanguage } from '../../../i18n/LanguageContext';
import { Card, Button, Badge } from '../../../components/ui';
import { AlertCircle, RefreshCw, Sparkles, Shield, Cpu, Radio, Palette } from 'lucide-react';
import { BrowserOverviewCard } from './BrowserOverviewCard';
import { BrowserCategoryTabs, type BrowserTabCategory } from './BrowserCategoryTabs';
import { BrowserSearchFilter } from './BrowserSearchFilter';
import { ProblemCenterSection } from './ProblemCenterSection';
import { ProblemDetailModal } from './ProblemDetailModal';
import { BeforeAfterComparison } from './BeforeAfterComparison';
import { PartialScanBanner } from './PartialScanBanner';
import { CanvasCard } from './CanvasCard';
import { WebGlCard } from './WebGlCard';
import { WebRtcCard } from './WebRtcCard';
import { AudioCard } from './AudioCard';
import { AutomationCard } from './AutomationCard';
import { HardwareDisplayCard } from './HardwareDisplayCard';
import { LocaleTimezoneCard } from './LocaleTimezoneCard';
import { PrivacyProtectionsCard } from './PrivacyProtectionsCard';
import { StorageNetworkCard } from './StorageNetworkCard';
import { BrowserExportModal } from './BrowserExportModal';
import { FingerprintExposureCard } from './FingerprintExposureCard';
import {
  extractBrowserProblems,
  detectSignalTransitions,
  type BrowserProblem,
  type SignalTransition,
} from '../utils/problemExtractor';
import type {
  CanvasData,
  WebGlData,
  WebRtcData,
  AudioData,
  AutomationData,
  HardwareData,
  DisplayData,
  LocaleData,
  TimezoneData,
  PrivacyProtectionsData,
  StorageData,
  NetworkData,
  ProfileGroup,
} from '../types';

export const BrowserIntelligenceView: React.FC = () => {
  const { t } = useLanguage();
  const {
    isScanning,
    isAnalyzing,
    isRechecking,
    profile,
    privacyAnalysis,
    previousProfile,
    previousAnalysis,
    failedCollectors,
    error,
    scanAndAnalyze,
    clearComparison,
  } = useBrowserIntelligence();

  const [activeTab, setActiveTab] = useState<BrowserTabCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [warningsOnly, setWarningsOnly] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [selectedProblem, setSelectedProblem] = useState<BrowserProblem | null>(null);
  const [isProblemModalOpen, setIsProblemModalOpen] = useState<boolean>(false);

  // Auto-scan on initial mount if not yet collected
  useEffect(() => {
    if (!profile && !isScanning && !isAnalyzing && !error) {
      scanAndAnalyze();
    }
  }, [profile, isScanning, isAnalyzing, error, scanAndAnalyze]);

  // Handle hash deep-linking on initial load or change
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        const targetElement = document.getElementById(hash);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    // Run when profile is loaded
    if (profile) {
      setTimeout(handleHash, 100);
    }
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [profile]);

  const scrollToElement = useCallback((elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleSelectMetric = useCallback((metricKey: 'total_signals' | 'hardware_leaks' | 'privacy_protections' | 'webrtc_status') => {
    switch (metricKey) {
      case 'total_signals':
        setActiveTab('ALL');
        setWarningsOnly(false);
        setSearchQuery('');
        scrollToElement('browser-signals');
        break;
      case 'hardware_leaks':
        setWarningsOnly(true);
        scrollToElement('problem-center');
        break;
      case 'privacy_protections':
        setActiveTab('AUTOMATION');
        scrollToElement('privacy-protections');
        break;
      case 'webrtc_status':
        setActiveTab('NETWORK');
        scrollToElement('webrtc');
        break;
    }
  }, [scrollToElement]);

  const handleOpenProblem = useCallback((problem: BrowserProblem) => {
    setSelectedProblem(problem);
    setIsProblemModalOpen(true);
  }, []);

  const handleRecheckProblem = useCallback(async (problemId: string) => {
    try {
      const res = await scanAndAnalyze(true);
      if (res && res.profile) {
        // Update selected problem in modal if open
        const updatedProblems = extractBrowserProblems(res.profile, res.analysis);
        const match = updatedProblems.find((p) => p.id === problemId);
        if (match) {
          setSelectedProblem(match);
        } else {
          // If resolved, keep the problem marked as resolved / not detected
          setSelectedProblem((prev) =>
            prev ? { ...prev, status: 'NOT_DETECTED', points: 0 } : null
          );
        }
      }
    } catch {
      // Handled in state
    }
  }, [scanAndAnalyze]);

  // Extract structured problems
  const problems = useMemo(() => {
    if (!profile) return [];
    return extractBrowserProblems(profile, privacyAnalysis);
  }, [profile, privacyAnalysis]);

  // Calculate before/after transitions if previous scan exists
  const signalTransitions = useMemo<SignalTransition[]>(() => {
    if (!profile || !previousProfile) return [];
    return detectSignalTransitions(previousProfile, profile, previousAnalysis, privacyAnalysis);
  }, [profile, previousProfile, previousAnalysis, privacyAnalysis]);

  // Handle loading state before first scan completes
  if ((isScanning || isAnalyzing) && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-base font-semibold text-slate-100">
            {t.browser.loadingMessage}
          </h3>
          <p className="text-xs text-slate-400">
            {t.browser.loadingSubtitle}
          </p>
        </div>
      </div>
    );
  }

  // Handle fatal error state
  if (error && !profile) {
    return (
      <div className="p-6">
        <Card variant="standard" className="p-8 text-center border-rose-800/80 bg-rose-950/20 space-y-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 w-fit mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-100">{t.browser.errorTitle}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">{error || t.browser.errorMessage}</p>
          </div>
          <Button
            variant="primary"
            onClick={() => scanAndAnalyze()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            {t.browser.rescan}
          </Button>
        </Card>
      </div>
    );
  }

  if (!profile) return null;

  // GRAPHICS is a composite profile group. Its payload is intentionally split into
  // independent WebGL and Canvas results; never cast the composite object directly
  // to either collector type because doing so hides successful collector data.
  const graphicsGroup = profile.groups.GRAPHICS as unknown as ProfileGroup<{
    webgl: WebGlData | null;
    canvas: CanvasData | null;
  }> | undefined;

  const canvasData = graphicsGroup?.data?.canvas ?? null;
  const webglData = graphicsGroup?.data?.webgl ?? null;

  const canvasGroup: ProfileGroup<CanvasData> = {
    name: 'GRAPHICS',
    title: 'Canvas 2D Rendering',
    status: canvasData?.status === 'ERROR' ? 'ERROR'
      : canvasData?.status === 'BLOCKED' ? 'BLOCKED'
        : canvasData?.status === 'UNAVAILABLE' ? 'UNAVAILABLE'
          : canvasData ? 'SUCCESS' : 'UNAVAILABLE',
    confidence: graphicsGroup?.confidence || 'HIGH',
    data: canvasData,
    derivedSignals: graphicsGroup?.derivedSignals || {},
    description: 'Canvas 2D geometry and text rendering entropy',
  };

  const webglGroup: ProfileGroup<WebGlData> = {
    name: 'GRAPHICS',
    title: 'WebGL GPU Diagnostics',
    status: webglData?.status === 'ERROR' ? 'ERROR'
      : webglData?.status === 'BLOCKED' ? 'BLOCKED'
        : webglData?.status === 'UNAVAILABLE' ? 'UNAVAILABLE'
          : webglData ? 'SUCCESS' : 'UNAVAILABLE',
    confidence: graphicsGroup?.confidence || 'HIGH',
    data: webglData,
    derivedSignals: graphicsGroup?.derivedSignals || {},
    description: 'GPU hardware parameters and unmasked driver renderer',
  };
  const webrtcGroup = profile.groups.WEBRTC as unknown as ProfileGroup<WebRtcData> | undefined;
  const audioGroup = profile.groups.AUDIO as unknown as ProfileGroup<AudioData> | undefined;
  const automationGroup = profile.groups.AUTOMATION as unknown as ProfileGroup<AutomationData> | undefined;
  const hardwareGroup = profile.groups.HARDWARE as unknown as ProfileGroup<HardwareData> | undefined;
  const displayGroup = profile.groups.DISPLAY as unknown as ProfileGroup<DisplayData> | undefined;
  const localeGroup = profile.groups.LOCALE as unknown as ProfileGroup<LocaleData> | undefined;
  const timezoneGroup = profile.groups.TIMEZONE as unknown as ProfileGroup<TimezoneData> | undefined;
  const privacyProtectionsGroup = profile.groups.PRIVACY_PROTECTIONS as unknown as ProfileGroup<PrivacyProtectionsData> | undefined;
  const storageGroup = profile.groups.STORAGE as unknown as ProfileGroup<StorageData> | undefined;
  const networkGroup = profile.groups.NETWORK as unknown as ProfileGroup<NetworkData> | undefined;

  // Search and Category Filtering Logic
  const query = searchQuery.toLowerCase().trim();

  const isCardVisible = (
    cardCategory: BrowserTabCategory,
    cardKeywords: string[],
    hasWarning: boolean
  ) => {
    // 1. Category tab filter
    if (activeTab !== 'ALL' && activeTab !== cardCategory) {
      return false;
    }
    // 2. Warnings only toggle filter
    if (warningsOnly && !hasWarning) {
      return false;
    }
    // 3. Search query filter
    if (query) {
      const matches = cardKeywords.some((kw) => kw.toLowerCase().includes(query));
      if (!matches) return false;
    }
    return true;
  };

  const showCanvas = isCardVisible(
    'GRAPHICS',
    ['canvas', '2d', 'raster', 'hash', 'gradient', 'winding', canvasGroup.data?.hash || ''],
    !canvasGroup.data?.isRandomized
  );

  const showWebGl = isCardVisible(
    'GRAPHICS',
    [
      'webgl',
      'gpu',
      'renderer',
      'vendor',
      'shader',
      webglGroup.data?.unmaskedRenderer || '',
      webglGroup.data?.unmaskedVendor || '',
      webglGroup.data?.hardwareHash || '',
    ],
    webglGroup.data?.isUnmasked ?? true
  );

  const showWebRtc = isCardVisible(
    'NETWORK',
    ['webrtc', 'ip', 'leak', 'stun', 'ice', 'mdns', ...(webrtcGroup?.data?.localIps || [])],
    webrtcGroup?.data?.leakDetected ?? false
  );

  const showAudio = isCardVisible(
    'GRAPHICS',
    ['audio', 'sound', 'audiocontext', 'compressor', 'oscillator', audioGroup?.data?.hash || ''],
    true
  );

  const showAutomation = isCardVisible(
    'AUTOMATION',
    ['automation', 'bot', 'webdriver', 'headless', 'selenium', 'puppeteer'],
    automationGroup?.data?.isAutomation ?? false
  );

  const showHardwareDisplay = isCardVisible(
    'HARDWARE',
    ['hardware', 'cpu', 'cores', 'ram', 'memory', 'screen', 'resolution', 'dpr', 'display', 'touch'],
    true
  );

  const showLocaleTimezone = isCardVisible(
    'IDENTITY',
    ['locale', 'language', 'timezone', 'time', 'utc', 'dst', timezoneGroup?.data?.timezone || ''],
    false
  );

  const showPrivacyProtections = isCardVisible(
    'AUTOMATION',
    ['privacy', 'gpc', 'dnt', 'incognito', 'adblock', 'protection'],
    false
  );

  const showStorageNetwork = isCardVisible(
    'NETWORK',
    ['storage', 'cookies', 'localstorage', 'indexeddb', 'network', 'connection', 'rtt', 'downlink'],
    false
  );

  return (
    <div id="browser-signals" className="space-y-6 scroll-mt-20">
      {/* 1. Master Overview & Score Gauge Card */}
      <BrowserOverviewCard
        profile={profile}
        privacyAnalysis={privacyAnalysis}
        isScanning={isScanning}
        isAnalyzing={isAnalyzing}
        onRescan={() => scanAndAnalyze(false)}
        onOpenExport={() => setIsExportOpen(true)}
        onSelectMetric={handleSelectMetric}
      />

      <FingerprintExposureCard profile={profile} />

      {/* 2. Partial Scan Banner (if any collectors failed) */}
      <PartialScanBanner failedCollectors={failedCollectors} />

      {/* 3. Before & After Comparison (if subsequent scan/recheck occurred) */}
      {previousAnalysis && previousProfile && (
        <BeforeAfterComparison
          previousScore={previousAnalysis.privacyScore}
          currentScore={privacyAnalysis?.privacyScore ?? 0}
          transitions={signalTransitions}
          onDismiss={clearComparison}
        />
      )}

      {/* 4. Problem Center (Remediation & Review Area) */}
      <ProblemCenterSection
        problems={problems}
        onOpenProblem={handleOpenProblem}
        onRecheck={handleRecheckProblem}
        isRechecking={isRechecking}
        onJumpToSignal={scrollToElement}
      />

      {/* 5. Category Tabs & Signal Search Filters */}
      <div className="space-y-3">
        <BrowserCategoryTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <BrowserSearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          warningsOnly={warningsOnly}
          onWarningsOnlyToggle={() => setWarningsOnly((prev) => !prev)}
        />
      </div>

      {/* 6. Diagnostic Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Canvas Card */}
        {showCanvas && canvasGroup && <CanvasCard group={canvasGroup} />}

        {/* WebGL Card */}
        {showWebGl && webglGroup && <WebGlCard group={webglGroup} />}

        {/* WebRTC Leak Card */}
        {showWebRtc && webrtcGroup && <WebRtcCard group={webrtcGroup} />}

        {/* Audio Signature Card */}
        {showAudio && audioGroup && <AudioCard group={audioGroup} />}

        {/* Bot & Automation Card */}
        {showAutomation && automationGroup && <AutomationCard group={automationGroup} />}

        {/* Hardware & Display Card */}
        {showHardwareDisplay && hardwareGroup && displayGroup && (
          <HardwareDisplayCard
            hardwareGroup={hardwareGroup}
            displayGroup={displayGroup}
          />
        )}

        {/* Locale & Timezone Card */}
        {showLocaleTimezone && localeGroup && timezoneGroup && (
          <LocaleTimezoneCard
            localeGroup={localeGroup}
            timezoneGroup={timezoneGroup}
          />
        )}

        {/* Privacy Protections Card */}
        {showPrivacyProtections && privacyProtectionsGroup && (
          <PrivacyProtectionsCard group={privacyProtectionsGroup} />
        )}

        {/* Storage & Network Card */}
        {showStorageNetwork && storageGroup && networkGroup && (
          <StorageNetworkCard
            storageGroup={storageGroup}
            networkGroup={networkGroup}
          />
        )}
      </div>

      {/* 7. Problem Detail Modal */}
      <ProblemDetailModal
        problem={selectedProblem}
        isOpen={isProblemModalOpen}
        onClose={() => setIsProblemModalOpen(false)}
        onRecheck={handleRecheckProblem}
        isRechecking={isRechecking}
      />

      {/* 8. Export Modal */}
      <BrowserExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        profile={profile}
      />
    </div>
  );
};
