import React from 'react';
import { Link } from '../router/Router';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/surfaces/Card';
import { Button } from '../components/actions/Button';
import { useLanguage } from '../i18n/LanguageContext';
import { ShieldAlert, ArrowLeft, ArrowRight } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const { t, direction } = useLanguage();

  return (
    <PageContainer maxWidth="md" className="flex items-center justify-center min-h-[60vh]">
      <Card variant="standard" className="w-full text-center p-8 sm:p-12 border-slate-800 bg-slate-900/90">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto mb-6 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="inline-block px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-semibold mb-4">
          HTTP 404
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight mb-3">
          {t.notFound.title}
        </h1>

        <p className="text-sm text-slate-400 font-sans max-w-md mx-auto mb-8 leading-relaxed">
          {t.notFound.description}
        </p>

        <div className="flex justify-center">
          <Link to="/">
            <Button
              variant="primary"
              size="md"
              leftIcon={direction === 'rtl' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            >
              {t.notFound.button}
            </Button>
          </Link>
        </div>
      </Card>
    </PageContainer>
  );
};
