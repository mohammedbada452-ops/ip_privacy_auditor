import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useRouter } from '../router/Router';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Card,
  Input,
  Button,
  StatusBadge,
  InlineError,
  Section,
  Stack,
  Divider,
} from '../components/ui';
import { Shield, Lock, User, Key, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const { login, isAuthenticated, username: currentAdmin, isLoading, error, retryAfterSeconds } = useAdminAuth();
  const { navigate } = useRouter();
  const { t, direction } = useLanguage();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login({
      username: username.trim(),
      password,
      secretKey: secretKey.trim() || undefined,
    });

    if (success) {
      navigate('/admin/dashboard');
    }
  };

  if (isAuthenticated) {
    return (
      <Section className="max-w-xl mx-auto py-12">
        <Card variant="highlighted" className="p-8 text-center border-cyan-500/30">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">{t.admin.sessionActive}</h2>
          <p className="text-sm text-slate-400 mb-6">
            {t.admin.authSuccess} ({currentAdmin || 'superadmin'})
          </p>
          <Button
            variant="primary"
            size="lg"
            className="w-full justify-center"
            onClick={() => navigate('/admin/dashboard')}
          >
            {t.admin.tabs.overview}
            <ArrowRight className={`w-4 h-4 ${direction === 'rtl' ? 'rotate-180 mr-2' : 'ml-2'}`} />
          </Button>
        </Card>
      </Section>
    );
  }

  return (
    <Section className="max-w-lg mx-auto py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4 shadow-inner">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight mb-2">
          {t.admin.loginTitle}
        </h1>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          {t.admin.loginSubtitle}
        </p>
      </div>

      <Card variant="standard" className="p-6 sm:p-8 border-slate-800 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/50 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-rose-300">
                <span className="font-semibold block mb-0.5">{t.admin.authError}</span>
                {error}
                {retryAfterSeconds && (
                  <span className="block mt-1 text-rose-400 font-mono">
                    {t.admin.retryInSeconds.replace('{seconds}', String(retryAfterSeconds))}
                  </span>
                )}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="admin-username" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {t.admin.usernameLabel}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                id="admin-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.admin.usernamePlaceholder}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-colors"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {t.admin.passwordLabel}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.admin.passwordPlaceholder}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-colors"
                autoComplete="current-password"
              />
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowSecretKey(!showSecretKey)}
              className="min-h-10 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-lg px-2 -mx-2"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{showSecretKey ? t.admin.hideSecretKeyInput : t.admin.useAdminMasterSecretKey}</span>
            </button>

            {showSecretKey && (
              <div className="mt-2.5">
                <input
                  id="admin-secret-key"
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder={t.admin.secretKeyPlaceholder}
                  aria-label={t.admin.secretKeyPlaceholder}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-colors"
                />
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full justify-center mt-2 bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
          >
            {isLoading ? t.admin.loggingIn : t.admin.loginButton}
          </Button>
        </form>

        <Divider className="my-6" />

        <div className="text-center text-xs text-slate-500">
          <p className="flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>{t.ui.protectedBySecurity}</span>
          </p>
        </div>
      </Card>
    </Section>
  );
};
