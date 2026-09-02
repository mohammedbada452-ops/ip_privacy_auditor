import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useRouter } from '../router/Router';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Card,
  Button,
  StatusBadge,
  Badge,
  Section,
  Stack,
  Grid,
  Divider,
  LoadingState,
  ErrorState,
} from '../components/ui';
import {
  Shield,
  Activity,
  Users,
  Globe,
  Lock,
  Radio,
  FileText,
  TrendingUp,
  Server,
  RefreshCw,
  LogOut,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Laptop,
} from 'lucide-react';

type AdminTab = 'overview' | 'scans' | 'logs' | 'traffic' | 'performance' | 'audit';
type AdminNavigationTab = AdminTab | 'securityLogs';

interface AdminTabConfig {
  id: AdminNavigationTab;
  label: string;
  icon: React.ElementType;
}

const ADMIN_TABS: readonly Pick<AdminTabConfig, 'id'>[] = [
  { id: 'overview' },
  { id: 'scans' },
  { id: 'securityLogs' },
  { id: 'traffic' },
  { id: 'performance' },
  { id: 'audit' },
];

export const AdminDashboard: React.FC = () => {
  const { isAuthenticated, username, logout, isLoading: authLoading } = useAdminAuth();
  const { navigate } = useRouter();
  const { t, formatNumber, formatDate, direction } = useLanguage();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const adminPanelHeadingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    adminPanelHeadingRef.current?.focus();
  }, [activeTab]);
  
  // Data states
  const [stats, setStats] = useState<any>(null);
  const [scansData, setScansData] = useState<any>({ data: [], pagination: { total: 0, page: 1, totalPages: 1 } });
  const [logsData, setLogsData] = useState<any>({ data: [], pagination: { total: 0, page: 1, totalPages: 1 } });
  const [trafficData, setTrafficData] = useState<any>(null);
  const [perfData, setPerfData] = useState<any>(null);
  const [auditData, setAuditData] = useState<any>({ data: [], pagination: { total: 0, page: 1, totalPages: 1 } });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [scansPage, setScansPage] = useState<number>(1);
  const [scansSearch, setScansSearch] = useState<string>('');
  const [scansCountry, setScansCountry] = useState<string>('');
  const [scansTier, setScansTier] = useState<string>('');
  
  const [logsPage, setLogsPage] = useState<number>(1);
  const [logsEvent, setLogsEvent] = useState<string>('');
  
  const [auditPage, setAuditPage] = useState<number>(1);

  // Guard: if not authenticated and not loading, redirect to /admin
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/admin');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const fetchOverview = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/admin/stats', {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        setStats(json.data);
      }
    } catch (err: any) {
      setFetchError(err.message);
    }
  }, [isAuthenticated]);

  const fetchScans = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const params = new URLSearchParams({
        page: scansPage.toString(),
        limit: '10',
        ...(scansSearch && { search: scansSearch }),
        ...(scansCountry && { country: scansCountry }),
        ...(scansTier && { tier: scansTier }),
      });
      const res = await fetch(`/api/admin/scans?${params.toString()}`, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        setScansData(json);
      }
    } catch (err: any) {
      setFetchError(err.message);
    }
  }, [isAuthenticated, scansPage, scansSearch, scansCountry, scansTier]);

  const fetchLogs = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const params = new URLSearchParams({
        page: logsPage.toString(),
        limit: '10',
        ...(logsEvent && { eventType: logsEvent }),
      });
      const res = await fetch(`/api/admin/logs?${params.toString()}`, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        setLogsData(json);
      }
    } catch (err: any) {
      setFetchError(err.message);
    }
  }, [isAuthenticated, logsPage, logsEvent]);

  const fetchTraffic = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/admin/metrics/pageviews', {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || {};
        setTrafficData({
          ...data,
          routeCounts: Object.fromEntries((data.routeBreakdown || []).map((x: any) => [x.route, x.count])),
          languageCounts: Object.fromEntries((data.languageBreakdown || []).map((x: any) => [x.language, x.count])),
          deviceCounts: Object.fromEntries((data.deviceBreakdown || []).map((x: any) => [x.category, x.count])),
        });
      }
    } catch (err: any) {
      setFetchError(err.message);
    }
  }, [isAuthenticated]);

  const fetchPerf = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/admin/metrics/performance', {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        setPerfData(json.data);
      }
    } catch (err: any) {
      setFetchError(err.message);
    }
  }, [isAuthenticated]);

  const fetchAudit = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const params = new URLSearchParams({
        page: auditPage.toString(),
        limit: '10',
      });
      const res = await fetch(`/api/admin/audit?${params.toString()}`, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        setAuditData(json);
      }
    } catch (err: any) {
      setFetchError(err.message);
    }
  }, [isAuthenticated, auditPage]);

  const refreshAll = async () => {
    setIsRefreshing(true);
    setFetchError(null);
    await Promise.all([
      fetchOverview(),
      fetchScans(),
      fetchLogs(),
      fetchTraffic(),
      fetchPerf(),
      fetchAudit(),
    ]);
    setIsRefreshing(false);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshAll();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'scans') fetchScans();
      if (activeTab === 'logs') fetchLogs();
      if (activeTab === 'traffic') fetchTraffic();
      if (activeTab === 'performance') fetchPerf();
      if (activeTab === 'audit') fetchAudit();
    }
  }, [isAuthenticated, activeTab, scansPage, scansCountry, scansTier, logsPage, logsEvent, auditPage]);

  if (authLoading || (isLoading && !stats)) {
    return (
      <Section className="py-16">
        <LoadingState message="Loading administrative metrics and threat logs..." />
      </Section>
    );
  }

  return (
    <main className="py-8 space-y-6" aria-labelledby="admin-portal-title">
      <div className="sr-only" aria-live="polite">{isRefreshing ? 'Refreshing administrative data.' : `Active administrative section: ${activeTab}.`}</div>
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
              <Shield className="w-3.5 h-3.5" />
              {t.footer.ownerAccess}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <h1 id="admin-portal-title" tabIndex={-1} ref={adminPanelHeadingRef} className="text-2xl font-bold text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded">{t.admin.portalTitle}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{t.admin.portalSubtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400 block">{t.admin.sessionActive}</span>
            <span className="text-xs font-mono font-medium text-slate-200">{username || 'admin'}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            isLoading={isRefreshing}
            className="border-slate-700 hover:border-slate-600"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${direction === 'rtl' ? 'ml-1.5' : 'mr-1.5'} ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              await logout();
              navigate('/admin');
            }}
          >
            <LogOut className={`w-3.5 h-3.5 ${direction === 'rtl' ? 'ml-1.5' : 'mr-1.5'}`} />
            {t.admin.logoutButton}
          </Button>
        </div>
      </div>

      {fetchError && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div role="tablist" aria-label={t.admin.portalTitle} aria-orientation="horizontal" className="flex overflow-x-auto no-scrollbar gap-2 p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
        {ADMIN_TABS.map(({ id }) => {
          const tab: AdminTabConfig = (() => {
            switch (id) {
              case 'overview':
                return { id, label: t.admin.tabs.overview, icon: Activity };
              case 'scans':
                return { id, label: t.admin.tabs.scans, icon: Users };
              case 'securityLogs':
                return { id, label: t.admin.tabs.securityLogs, icon: Shield };
              case 'traffic':
                return { id, label: t.admin.tabs.traffic, icon: Globe };
              case 'performance':
                return { id, label: t.admin.tabs.performance, icon: Server };
              case 'audit':
                return { id, label: t.admin.tabs.audit, icon: FileText };
              default:
                throw new Error(`Unsupported admin navigation tab: ${String(id)}`);
            }
          })();
          const Icon = tab.icon;
          const isActive = (activeTab === 'overview' && tab.id === 'overview') ||
            (activeTab === 'scans' && tab.id === 'scans') ||
            (activeTab === 'logs' && tab.id === 'securityLogs') ||
            (activeTab === 'traffic' && tab.id === 'traffic') ||
            (activeTab === 'performance' && tab.id === 'performance') ||
            (activeTab === 'audit' && tab.id === 'audit');
          
          return (
            <button
              key={tab.id}
              id={`admin-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`admin-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => {
                setActiveTab(tab.id === 'securityLogs' ? 'logs' : tab.id);
              }}
              onKeyDown={(event) => {
                const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
                const currentIndex = tabs.indexOf(event.currentTarget);
                if (!tabs.length) return;
                let nextIndex = currentIndex;
                if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
                if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                if (event.key === 'Home') nextIndex = 0;
                if (event.key === 'End') nextIndex = tabs.length - 1;
                if (nextIndex !== currentIndex) {
                  event.preventDefault();
                  const nextTab = tabs[nextIndex];
                  nextTab.focus();
                  nextTab.click();
                }
              }}
              className={`flex items-center gap-2 min-h-10 px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && stats && (
        <section id="admin-panel-overview" role="tabpanel" tabIndex={0} aria-labelledby="admin-tab-overview" className="outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded-xl">
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="p-5 border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t.admin.kpi.totalScans}
                </span>
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-100 mb-1">
                {formatNumber(stats.totalScans || 0)}
              </div>
              <span className="text-xs text-slate-500">
                {t.admin.kpi.todayScans}: <span className="text-slate-300 font-mono">{formatNumber(stats.todayScans || 0)}</span>
              </span>
            </Card>

            <Card className="p-5 border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t.admin.kpi.uniqueAnonymizedIps}
                </span>
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-100 mb-1">
                {formatNumber(stats.uniqueIpsCount || 0)}
              </div>
              <span className="text-xs text-emerald-400 font-mono">{t.ui.hmacAnonymized}</span>
            </Card>

            <Card className="p-5 border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t.admin.kpi.avgScore}
                </span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-100 mb-1 font-mono">
                {stats.averagePrivacyScore} / 100
              </div>
              <span className="text-xs text-slate-500">{t.ui.fleetAverageScore}</span>
            </Card>

            <Card className="p-5 border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t.admin.kpi.vpnRate}
                </span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-100 mb-1 font-mono">
                {stats.vpnDetectionRate}%
              </div>
              <span className="text-xs text-slate-500">{t.ui.vpnDatacenterRelayDetected}</span>
            </Card>

            <Card className="p-5 border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t.admin.kpi.leakRate}
                </span>
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Radio className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-100 mb-1 font-mono">
                {stats.webRtcLeakRate}%
              </div>
              <span className="text-xs text-slate-500">Confirmed WebRTC private-IP leaks / verified checks</span>
            </Card>

            <Card className="p-5 border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Audit Data Quality
                </span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-emerald-400 mb-1">
                {stats.completeRatePercent >= 95 ? 'COMPLETE' : 'PARTIAL'}
              </div>
              <span className="text-xs text-slate-500">{stats.completeRatePercent}% of stored audit records are complete</span>
            </Card>
          </div>

          {/* Executive quality & reliability KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t.admin.executive.evidenceCoverage, value: `${stats.averageCoveragePercent ?? 0}%`, hint: `${stats.completeRatePercent ?? 0}${t.admin.executive.completeAudits}`, icon: CheckCircle2 },
              { label: t.admin.executive.highConfidence, value: `${stats.confidenceCounts?.HIGH ?? 0}`, hint: t.admin.executive.verifiedAuditRecords, icon: Shield },
              { label: t.admin.executive.networkVerified, value: `${stats.networkVerifiedRate ?? 0}%`, hint: t.admin.executive.recordedAudits, icon: Globe },
              { label: t.admin.executive.webrtcVerified, value: `${stats.webRtcVerifiedRate ?? 0}%`, hint: t.admin.executive.recordedAudits, icon: Radio },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="p-5 border-slate-800 bg-slate-900/70">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.label}</span>
                    <Icon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-100">{item.value}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{item.hint}</div>
                </Card>
              );
            })}
          </div>

          {/* Executive charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="p-6 border-slate-800 bg-slate-900/70">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{t.admin.executive.sevenDayVolume}</h3>
                  <p className="text-xs text-slate-500 mt-1">{t.admin.executive.observedActivity}</p>
                </div>
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="h-44 flex items-end gap-2 border-b border-slate-800 pb-2">
                {(stats.dailyTrend || []).map((day: any) => {
                  const max = Math.max(1, ...(stats.dailyTrend || []).map((d: any) => d.count));
                  const height = Math.max(6, Math.round((day.count / max) * 100));
                  return (
                    <div key={day.date} className="flex-1 h-full flex flex-col justify-end items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-slate-400">{formatNumber(day.count)}</span>
                      <div className="w-full max-w-10 rounded-t bg-cyan-500/60 hover:bg-cyan-400/70 transition-colors" style={{ height: `${height}%` }} title={`${day.date}: ${day.count}`} />
                      <span className="text-[9px] text-slate-600 rotate-[-35deg] origin-top">{String(day.date).slice(5)}</span>
                    </div>
                  );
                })}
                {(!stats.dailyTrend || stats.dailyTrend.length === 0) && <div className="w-full text-center text-xs text-slate-500 self-center">{t.admin.executive.noAuditActivity}</div>}
              </div>
            </Card>

            <Card className="p-6 border-slate-800 bg-slate-900/70">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{t.admin.executive.scoreDistribution}</h3>
                  <p className="text-xs text-slate-500 mt-1">{t.admin.executive.scoreDistributionDesc}</p>
                </div>
                <Activity className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="space-y-4">
                {(['EXCELLENT', 'GOOD', 'MODERATE', 'CRITICAL'] as const).map((tier) => {
                  const count = Number(stats.tierCounts?.[tier] || 0);
                  const total = Math.max(1, Number(stats.scoreDistributionTotal ?? stats.completedScans ?? 0));
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={tier}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold text-slate-300">{tier === 'EXCELLENT' ? t.admin.executive.excellent : tier === 'GOOD' ? t.admin.executive.good : tier === 'MODERATE' ? t.admin.executive.moderate : t.admin.executive.critical}</span>
                        <span className="font-mono text-slate-500">{formatNumber(count)} · {pct}%</span>
                      </div>
                      <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-indigo-500/70 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Scanning Regions */}
            <Card className="p-6 border-slate-800 bg-slate-900/70">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-200">{t.admin.kpi.topCountries}</h3>
                <Globe className="w-4 h-4 text-slate-400" />
              </div>
              <div className="space-y-3">
                {(!stats.topCountries || stats.topCountries.length === 0) ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No country telemetry recorded yet.
                  </div>
                ) : (
                  stats.topCountries.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-6 font-mono font-bold text-indigo-400">{item.countryCode}</span>
                        <span className="text-slate-300">Country Code: {item.countryCode}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full"
                            style={{
                              width: `${Math.min(100, Math.round((item.count / (stats.totalScans || 1)) * 100))}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono text-slate-400">{formatNumber(item.count)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Score Tier Distribution */}
            <Card className="p-6 border-slate-800 bg-slate-900/70">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-200">{t.admin.kpi.scoreDistribution}</h3>
                <Shield className="w-4 h-4 text-slate-400" />
              </div>
              <div className="space-y-3">
                {[
                  { tier: 'EXCELLENT', label: 'Excellent (80-100)', color: 'bg-emerald-500', text: 'text-emerald-400' },
                  { tier: 'GOOD', label: 'Good (60-79)', color: 'bg-cyan-500', text: 'text-cyan-400' },
                  { tier: 'MODERATE', label: 'Moderate (40-59)', color: 'bg-amber-500', text: 'text-amber-400' },
                  { tier: 'CRITICAL', label: 'Critical (0-39)', color: 'bg-rose-500', text: 'text-rose-400' },
                ].map((item) => {
                  const count = stats.tierCounts?.[item.tier] || 0;
                  const distributionTotal = Number(stats.scoreDistributionTotal ?? stats.completedScans ?? 0);
                  const percent = distributionTotal > 0 ? Math.round((count / distributionTotal) * 100) : 0;
                  return (
                    <div key={item.tier} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className={`font-semibold ${item.text}`}>{item.label}</span>
                        <span className="font-mono text-slate-400">{count} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className={`${item.color} h-full rounded-full transition-all`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
        </section>
      )}

      {/* TAB 2: SCANS */}
      {activeTab === 'scans' && (
        <section id="admin-panel-scans" role="tabpanel" tabIndex={0} aria-labelledby="admin-tab-scans">
        <Card className="p-6 border-slate-800 bg-slate-900/70 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-100">{t.admin.scansTable.title}</h2>
              <p className="text-xs text-slate-400">{t.admin.scansTable.subtitle}</p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder={t.admin.scansTable.searchPlaceholder}
                  value={scansSearch}
                  onChange={(e) => {
                    setScansSearch(e.target.value);
                    setScansPage(1);
                  }}
                  className="bg-slate-950 border border-slate-750 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={scansTier}
                onChange={(e) => {
                  setScansTier(e.target.value);
                  setScansPage(1);
                }}
                className="bg-slate-950 border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">{t.admin.scansTable.filterTier}</option>
                <option value="EXCELLENT">EXCELLENT</option>
                <option value="GOOD">GOOD</option>
                <option value="MODERATE">MODERATE</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800/70" role="region" tabIndex={0} aria-label="Scrollable scans table">
            <table className="w-full text-xs text-left">
              <thead className="text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800 font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">{t.admin.scansTable.country}</th>
                  <th className="py-3 px-4">{t.admin.scansTable.city}</th>
                  <th className="py-3 px-4">{t.admin.scansTable.isp}</th>
                  <th className="py-3 px-4">{t.admin.scansTable.score}</th>
                  <th className="py-3 px-4">{t.admin.scansTable.flags}</th>
                  <th className="py-3 px-4">{t.admin.scansTable.device}</th>
                  <th className="py-3 px-4">{t.admin.scansTable.timestamp}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {scansData.data?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No scan session records found.
                    </td>
                  </tr>
                ) : (
                  scansData.data?.map((scan: any) => (
                    <tr key={scan.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                        {scan.countryCode}
                      </td>
                      <td className="py-3 px-4 text-slate-200">{scan.city}</td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-[11px] max-w-[200px] truncate">
                        {scan.isp}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                            scan.scoreTier === 'EXCELLENT'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                              : scan.scoreTier === 'GOOD'
                              ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/50'
                              : scan.scoreTier === 'MODERATE'
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                          }`}
                        >
                          {scan.privacyScore} / 100 ({scan.scoreTier})
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {scan.isVpn && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-400 border border-purple-800/50 text-[10px] font-semibold">
                              VPN
                            </span>
                          )}
                          {scan.isWebRtcLeak && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800/50 text-[10px] font-semibold">
                              LEAK
                            </span>
                          )}
                          {!scan.isVpn && !scan.isWebRtcLeak && scan.verificationStatus === 'COMPLETE' && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                              {t.admin.scansTable.clean}
                            </span>
                          )}
                          {(scan.verificationStatus !== 'COMPLETE' || scan.isVpn == null || scan.isWebRtcLeak == null) && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-400 border border-amber-900/60 text-[10px] font-semibold">
                              {scan.verificationStatus === 'PARTIAL' ? 'PARTIAL' : 'UNVERIFIED'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{scan.userAgentCategory}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDate(scan.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
            <span>
              {t.admin.pagination.showing} <span className="font-semibold text-slate-200">{(scansData.pagination.page - 1) * 10 + 1}</span> - <span className="font-semibold text-slate-200">{Math.min(scansData.pagination.page * 10, scansData.pagination.total)}</span> {t.admin.pagination.of} <span className="font-semibold text-slate-200">{scansData.pagination.total}</span> {t.admin.pagination.results}
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={scansPage <= 1}
                onClick={() => setScansPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {t.admin.pagination.prev}
              </Button>
              <span className="font-mono text-slate-300">
                {scansPage} / {scansData.pagination.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={scansPage >= (scansData.pagination.totalPages || 1)}
                onClick={() => setScansPage((p) => p + 1)}
              >
                {t.admin.pagination.next}
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </Card>
        </section>
      )}

      {/* TAB 3: SECURITY LOGS */}
      {activeTab === 'logs' && (
        <section id="admin-panel-securityLogs" role="tabpanel" tabIndex={0} aria-labelledby="admin-tab-securityLogs">
        <Card className="p-6 border-slate-800 bg-slate-900/70 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-100">{t.admin.logsTable.title}</h2>
              <p className="text-xs text-slate-400">{t.admin.logsTable.subtitle}</p>
            </div>

            <select
              value={logsEvent}
              onChange={(e) => {
                setLogsEvent(e.target.value);
                setLogsPage(1);
              }}
              className="bg-slate-950 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">{t.admin.logsTable.filterEvent}</option>
              <option value="ADMIN_LOGIN_SUCCESS">ADMIN_LOGIN_SUCCESS</option>
              <option value="ADMIN_LOGIN_FAILED">ADMIN_LOGIN_FAILED</option>
              <option value="RATE_LIMIT_EXCEEDED">RATE_LIMIT_EXCEEDED</option>
              <option value="UNAUTHORIZED_ACCESS">UNAUTHORIZED_ACCESS</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800/70" role="region" tabIndex={0} aria-label="Scrollable security logs table">
            <table className="w-full text-xs text-left">
              <thead className="text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800 font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">{t.admin.logsTable.eventType}</th>
                  <th className="py-3 px-4">{t.admin.logsTable.ipAddress}</th>
                  <th className="py-3 px-4">{t.admin.logsTable.details}</th>
                  <th className="py-3 px-4">{t.admin.logsTable.timestamp}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logsData.data?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No security event logs recorded.
                    </td>
                  </tr>
                ) : (
                  logsData.data?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                            log.eventType.includes('SUCCESS')
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                              : log.eventType.includes('RATE_LIMIT')
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                              : 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                          }`}
                        >
                          {log.eventType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{log.ipAddress}</td>
                      <td className="py-3 px-4 text-slate-300">{log.details}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDate(log.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
            <span>
              {t.admin.pagination.showing} <span className="font-semibold text-slate-200">{logsData.pagination.total > 0 ? (logsData.pagination.page - 1) * 10 + 1 : 0}</span> - <span className="font-semibold text-slate-200">{Math.min(logsData.pagination.page * 10, logsData.pagination.total)}</span> {t.admin.pagination.of} <span className="font-semibold text-slate-200">{logsData.pagination.total}</span>
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={logsPage <= 1}
                onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {t.admin.pagination.prev}
              </Button>
              <span className="font-mono text-slate-300">
                {logsPage} / {logsData.pagination.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={logsPage >= (logsData.pagination.totalPages || 1)}
                onClick={() => setLogsPage((p) => p + 1)}
              >
                {t.admin.pagination.next}
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </Card>
        </section>
      )}

      {/* TAB 4: TRAFFIC & PAGE VIEWS */}
      {activeTab === 'traffic' && trafficData && (
        <section id="admin-panel-traffic" role="tabpanel" tabIndex={0} aria-labelledby="admin-tab-traffic">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 border-slate-800 bg-slate-900/70">
            <h3 className="text-sm font-bold text-slate-200 mb-4">{t.admin.traffic.routesTitle}</h3>
            <div className="space-y-3">
              {Object.keys(trafficData.routeCounts || {}).length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">{t.ui.noRouteTraffic}</div>
              ) : (
                Object.entries(trafficData.routeCounts || {}).map(([route, count]: any) => (
                  <div key={route} className="flex justify-between items-center text-xs">
                    <span className="font-mono text-indigo-400">{route}</span>
                    <span className="font-mono font-bold text-slate-200">{formatNumber(count)}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6 border-slate-800 bg-slate-900/70">
            <h3 className="text-sm font-bold text-slate-200 mb-4">{t.admin.traffic.languagesTitle}</h3>
            <div className="space-y-3">
              {Object.keys(trafficData.languageCounts || {}).length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">{t.ui.noLanguageTraffic}</div>
              ) : (
                Object.entries(trafficData.languageCounts || {}).map(([lang, count]: any) => (
                  <div key={lang} className="flex justify-between items-center text-xs">
                    <span className="uppercase font-mono text-cyan-400 font-bold">{lang}</span>
                    <span className="font-mono font-bold text-slate-200">{formatNumber(count)}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6 border-slate-800 bg-slate-900/70">
            <h3 className="text-sm font-bold text-slate-200 mb-4">{t.admin.traffic.devicesTitle}</h3>
            <div className="space-y-3">
              {Object.keys(trafficData.deviceCounts || {}).length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">{t.ui.noDeviceTelemetry}</div>
              ) : (
                Object.entries(trafficData.deviceCounts || {}).map(([device, count]: any) => (
                  <div key={device} className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">{device}</span>
                    <span className="font-mono font-bold text-slate-200">{formatNumber(count)}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
        </section>
      )}

      {/* TAB 5: PERFORMANCE */}
      {activeTab === 'performance' && perfData && (
        <section id="admin-panel-performance" role="tabpanel" tabIndex={0} aria-labelledby="admin-tab-performance">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 border-slate-800 bg-slate-900/70">
              <span className="text-xs text-slate-400 block mb-1">{t.admin.performance.avgLatency}</span>
              <div className="text-2xl font-bold font-mono text-cyan-400">{perfData.averageResponseTimeMs ?? perfData.avgResponseTimeMs ?? 0} ms</div>
            </Card>
            <Card className="p-5 border-slate-800 bg-slate-900/70">
              <span className="text-xs text-slate-400 block mb-1">{t.admin.performance.totalReqs}</span>
              <div className="text-2xl font-bold font-mono text-indigo-400">{formatNumber(perfData.totalRequests)}</div>
            </Card>
            <Card className="p-5 border-slate-800 bg-slate-900/70">
              <span className="text-xs text-slate-400 block mb-1">{t.admin.performance.errorRate}</span>
              <div className="text-2xl font-bold font-mono text-emerald-400">{perfData.errorRatePercent}%</div>
            </Card>
          </div>

          <Card className="p-6 border-slate-800 bg-slate-900/70">
            <h3 className="text-sm font-bold text-slate-200 mb-4">{t.ui.apiPerformanceBenchmarks}</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-800/70" role="region" tabIndex={0} aria-label="Scrollable performance table">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">{t.admin.performance.endpointCol}</th>
                    <th className="py-2.5 px-4">{t.admin.performance.reqCountCol}</th>
                    <th className="py-2.5 px-4">{t.admin.performance.latencyCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {(!perfData.endpointLatencies || perfData.endpointLatencies.length === 0) ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-500 font-sans">
                        No API performance metrics recorded yet.
                      </td>
                    </tr>
                  ) : (
                    perfData.endpointLatencies.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 text-indigo-300">{item.endpoint}</td>
                        <td className="py-2.5 px-4 text-slate-300">{formatNumber(item.count)}</td>
                        <td className="py-2.5 px-4 text-cyan-400">{item.avgLatencyMs} ms</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        </section>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <section id="admin-panel-audit" role="tabpanel" tabIndex={0} aria-labelledby="admin-tab-audit">
        <Card className="p-6 border-slate-800 bg-slate-900/70 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-100">{t.admin.auditTrail.title}</h2>
            <p className="text-xs text-slate-400">{t.admin.auditTrail.subtitle}</p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800/70" role="region" tabIndex={0} aria-label="Scrollable audit trail table">
            <table className="w-full text-xs text-left">
              <thead className="text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800 font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">{t.admin.auditTrail.adminCol}</th>
                  <th className="py-3 px-4">{t.admin.auditTrail.actionCol}</th>
                  <th className="py-3 px-4">{t.admin.auditTrail.ipCol}</th>
                  <th className="py-3 px-4">{t.admin.auditTrail.detailsCol}</th>
                  <th className="py-3 px-4">{t.admin.auditTrail.timeCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditData.data?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No administrative audit records logged.
                    </td>
                  </tr>
                ) : (
                  auditData.data?.map((audit: any) => (
                    <tr key={audit.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-200">
                        {audit.adminUsername}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-400 border border-indigo-800/50 font-mono text-[11px]">
                          {audit.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{audit.ipAddress}</td>
                      <td className="py-3 px-4 text-slate-300">{audit.details}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDate(audit.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
            <span>
              {t.admin.pagination.showing} <span className="font-semibold text-slate-200">{auditData.pagination.total > 0 ? (auditData.pagination.page - 1) * 10 + 1 : 0}</span> - <span className="font-semibold text-slate-200">{Math.min(auditData.pagination.page * 10, auditData.pagination.total)}</span> {t.admin.pagination.of} <span className="font-semibold text-slate-200">{auditData.pagination.total}</span>
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={auditPage <= 1}
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {t.admin.pagination.prev}
              </Button>
              <span className="font-mono text-slate-300">
                {auditPage} / {auditData.pagination.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={auditPage >= (auditData.pagination.totalPages || 1)}
                onClick={() => setAuditPage((p) => p + 1)}
              >
                {t.admin.pagination.next}
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </Card>
        </section>
      )}
    </main>
  );
};
