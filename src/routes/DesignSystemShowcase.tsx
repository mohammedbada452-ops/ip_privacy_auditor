import React, { useEffect, useRef, useState } from 'react';
import {
  PageContainer,
  Section,
  Grid,
  Stack,
  Divider,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Badge,
  StatusBadge,
  StatusIndicator,
  SeverityBadge,
  Button,
  IconButton,
  RefreshButton,
  ScoreGauge,
  ScoreLabel,
  FactorStatus,
  RiskIndicator,
  Recommendation,
  Input,
  Select,
  Checkbox,
  Toggle,
  DataRow,
  KeyValue,
  CodeValue,
  MonoValue,
  CopyValue,
  Skeleton,
  LoadingState,
  ErrorState,
  EmptyState,
  IconWrapper,
} from '../components/ui';
import { Shield, Key, Eye, AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export const DesignSystemShowcase: React.FC = () => {
  const { t } = useLanguage();
  const [toggleState, setToggleState] = useState<boolean>(true);
  const [checkboxState, setCheckboxState] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [gaugeScore, setGaugeScore] = useState<number>(85);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  }, []);

  const handleRefreshDemo = () => {
    setIsRefreshing(true);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      setIsRefreshing(false);
      setGaugeScore((prev) => (prev === 85 ? 42 : prev === 42 ? 68 : 85));
      refreshTimerRef.current = null;
    }, 1200);
  };

  const showDemoAction = (msg: string) => {
    setFeedbackMessage(msg);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedbackMessage(null);
      feedbackTimerRef.current = null;
    }, 3000);
  };

  return (
    <PageContainer maxWidth="7xl">
      <Section
        title={t.placeholders.designSystemTitle}
        subtitle={t.placeholders.designSystemDesc}
        action={
          <RefreshButton
            onRefresh={handleRefreshDemo}
            isRefreshing={isRefreshing}
            label={t.placeholders.cycleGaugeDemo}
          />
        }
      >
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6 text-xs font-mono text-cyan-400">
          PROTOTYPE ROUTE: /design-system &bull; All UI Primitives Verified
        </div>

        <Stack gap={8}>
          {/* 1. PRIVACY SCORE GAUGE & PRIVACY PRIMITIVES */}
          <Card variant="highlighted">
            <CardHeader
              title={t.ui.designSecurityPrimitives}
              icon={<Shield className="w-5 h-5" />}
              statusBadge={<Badge variant="info">STAGE 3 PRIMITIVE</Badge>}
            />
            <CardBody>
              <Grid cols={1} colsMd={3} gap={6}>
                <div className="flex flex-col items-center justify-center bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <ScoreGauge
                    score={gaugeScore}
                    subtext={t.privacy.scoreSubtitle}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase text-slate-400 font-bold mb-2">
                    Score Labels & Risk Indicators
                  </h4>
                  <div className="flex items-center gap-3">
                    <ScoreLabel score={92} size="lg" />
                    <ScoreLabel score={65} size="md" />
                    <ScoreLabel score={35} size="sm" />
                  </div>
                  <Divider />
                  <RiskIndicator level="critical" scoreDeduction={25} label="DNS Leak" />
                  <RiskIndicator level="medium" scoreDeduction={10} label="Canvas Hash" />
                  <RiskIndicator level="low" scoreDeduction={5} label="WebRTC Enabled" />
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase text-slate-400 font-bold mb-2">
                    Signal Factors & Remediation
                  </h4>
                  <FactorStatus
                    state="pass"
                    title={t.ui.designEncryptedDns}
                    description="DNS requests routed through DoH provider."
                  />
                  <FactorStatus
                    state="warn"
                    title={t.ui.designCanvasEntropy}
                    deduction={15}
                    description="Unique canvas hash detected by script."
                  />
                  <FactorStatus
                    state="fail"
                    title={t.ui.designWebrtcExposure}
                    deduction={30}
                    description="Local IP address exposed via WebRTC candidate."
                  />
                </div>
              </Grid>

              <div className="mt-6">
                <Recommendation
                  title={t.ui.designWebrtcMasking}
                  actionText="Disable WebRTC STUN or use a browser privacy extension"
                  impact="high"
                  description="Your browser leaked a private network candidate (192.168.1.105) to our test endpoint."
                  onApplyAction={() => showDemoAction('Demo remediation clicked')}
                />
              </div>
            </CardBody>
          </Card>

          {/* 2. CARD VARIANTS */}
          <Section title={t.ui.designCardVariants}>
            <Grid cols={1} colsSm={2} colsLg={3} gap={4}>
              <Card variant="standard">
                <CardHeader title={t.ui.designStandardSurface} icon={<Shield className="w-4 h-4" />} />
                <CardBody>{t.ui.designStandardSurface}</CardBody>
                <CardFooter>{t.ui.designFooterMetadata}</CardFooter>
              </Card>

              <Card variant="compact">
                <CardHeader title={t.ui.designCompactVariant} />
                <CardBody>{t.ui.designCompactVariant}</CardBody>
              </Card>

              <Card variant="highlighted">
                <CardHeader title={t.ui.designHighlightedVariant} statusBadge={<StatusBadge status="info" />} />
                <CardBody>{t.ui.designHighlightedVariant}</CardBody>
              </Card>

              <Card variant="success">
                <CardHeader title={t.ui.designSuccessVariant} statusBadge={<StatusBadge status="success" />} />
                <CardBody>{t.ui.designSuccessVariant}</CardBody>
              </Card>

              <Card variant="warning">
                <CardHeader title={t.ui.designWarningVariant} statusBadge={<StatusBadge status="warning" />} />
                <CardBody>{t.ui.designWarningVariant}</CardBody>
              </Card>

              <Card variant="danger">
                <CardHeader title={t.ui.designDangerVariant} statusBadge={<StatusBadge status="danger" />} />
                <CardBody>{t.ui.designDangerVariant}</CardBody>
              </Card>
            </Grid>
          </Section>

          {/* 3. STATUS & BADGES */}
          <Section title={t.ui.designSemanticStatus}>
            <Card variant="standard">
              <CardBody>
                <Stack gap={4}>
                  <div>
                    <h4 className="text-xs font-mono uppercase text-slate-400 mb-2">
                      Status Badges
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status="success" />
                      <StatusBadge status="warning" />
                      <StatusBadge status="danger" />
                      <StatusBadge status="info" />
                      <StatusBadge status="neutral" />
                      <StatusBadge status="unknown" />
                      <StatusBadge status="unavailable" />
                      <StatusBadge status="detected" />
                      <StatusBadge status="not-detected" />
                    </div>
                  </div>

                  <Divider />

                  <div>
                    <h4 className="text-xs font-mono uppercase text-slate-400 mb-2">
                      Severity Badges & Pulsing Indicators
                    </h4>
                    <div className="flex flex-wrap items-center gap-4">
                      <SeverityBadge severity="critical" />
                      <SeverityBadge severity="high" />
                      <SeverityBadge severity="medium" />
                      <SeverityBadge severity="low" />
                      <SeverityBadge severity="info" />
                      <StatusIndicator status="success" label="Active" />
                      <StatusIndicator status="danger" label="Exposed" />
                      <StatusIndicator status="warning" label="Alert" />
                    </div>
                  </div>
                </Stack>
              </CardBody>
            </Card>
          </Section>

          {/* 4. DATA PRIMITIVES */}
          <Section title={t.ui.designDataMono}>
            <Card variant="standard">
              <CardBody>
                <Stack gap={3}>
                  <DataRow
                    label="Public IPv4 Address"
                    value="198.51.100.42"
                    isMono
                    status={<StatusBadge status="warning" label="PROXIED" size="sm" />}
                    description="Cloudflare edge node egress IP."
                  />
                  <DataRow
                    label="Canvas Fingerprint Hash"
                    value="a8f3b219c018293e819a"
                    isMono
                    status={<StatusBadge status="danger" label="HIGH ENTROPY" size="sm" />}
                  />
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <CopyValue label="API Key Stub" value="pk_test_privacy_auditor_token_2026" />
                    <CodeValue size="sm">User-Agent: Mozilla/5.0 (X11; Linux x86_64)</CodeValue>
                    <MonoValue color="emerald" size="base">
                      PASSED_200_OK
                    </MonoValue>
                  </div>
                </Stack>
              </CardBody>
            </Card>
          </Section>

          {/* 5. FORM CONTROLS */}
          <Section title={t.ui.designForms}>
            <Card variant="standard">
              <CardBody>
                <Grid cols={1} colsMd={2} gap={6}>
                  <Stack gap={4}>
                    <Input
                      label="Inspect IP or Hostname"
                      placeholder="e.g. 8.8.8.8 or example.com"
                      isMono
                      leftIcon={<Eye className="w-4 h-4" />}
                    />
                    <Select
                      label="Filter Signal Category"
                      options={[
                        { value: 'all', label: 'All Signals' },
                        { value: 'network', label: 'Network & IP' },
                        { value: 'browser', label: 'Browser Hardware' },
                        { value: 'headers', label: 'HTTP Headers' },
                      ]}
                    />
                  </Stack>

                  <Stack gap={4}>
                    <Toggle
                      label="Real-time WebRTC Capture"
                      description="Periodically inspect WebRTC ICE candidates in the browser."
                      checked={toggleState}
                      onChange={setToggleState}
                    />
                    <Checkbox
                      label={t.ui.includeAudioSampling}
                      description={t.ui.generateAudioHash}
                      checked={checkboxState}
                      onChange={(e) => setCheckboxState(e.target.checked)}
                    />
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button variant="primary" leftIcon={<Shield className="w-4 h-4" />}>
                        {t.ui.primaryAction}
                      </Button>
                      <Button variant="secondary">{t.ui.designSecondary}</Button>
                      <Button variant="outline">{t.ui.designOutline}</Button>
                      <Button variant="danger">{t.ui.designDanger}</Button>
                      <IconButton
                        icon={<Key className="w-4 h-4" />}
                        ariaLabel={t.ui.authenticationSettings}
                      />
                    </div>
                  </Stack>
                </Grid>
              </CardBody>
            </Card>
          </Section>

          {/* 6. FEEDBACK & STATES */}
          <Section title={t.ui.designFeedback}>
            <Grid cols={1} colsMd={3} gap={4}>
              <Card variant="standard">
                <CardHeader title={t.ui.designLoading} />
                <CardBody>
                  <LoadingState message="Processing canvas fingerprint..." />
                </CardBody>
              </Card>

              <Card variant="standard">
                <CardHeader title={t.ui.designError} />
                <CardBody>
                  <ErrorState
                    title={t.ui.designProbeFailed}
                    message="Browser blocked STUN query due to strict Content-Security-Policy."
                    onRetry={() => showDemoAction('Retry clicked')}
                  />
                </CardBody>
              </Card>

              <Card variant="standard">
                <CardHeader title={t.ui.designEmpty} />
                <CardBody>
                  <EmptyState
                    title={t.ui.designEmptyHeaders}
                    description="Execute a request scan to view incoming HTTP headers."
                    actionLabel="Scan Headers"
                    onAction={() => showDemoAction('Scan clicked')}
                  />
                </CardBody>
              </Card>
            </Grid>
          </Section>

          {feedbackMessage && (
            <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-cyan-500/40 text-cyan-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-mono animate-in fade-in slide-in-from-bottom-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>{feedbackMessage}</span>
            </div>
          )}
        </Stack>
      </Section>
    </PageContainer>
  );
};
