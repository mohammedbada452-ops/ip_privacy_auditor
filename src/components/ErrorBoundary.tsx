import React, { Component, ErrorInfo, ReactNode } from 'react';
import { DICTIONARIES } from '../i18n/validator';
import type { Language } from '../i18n/types';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public override render() {
    const lang = (typeof document !== 'undefined' ? document.documentElement.lang : 'en') as Language;
    const t = DICTIONARIES[lang] || DICTIONARIES.en;
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-xl p-6 shadow-xl text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">{t.errorBoundary.title}</h2>
            <p className="text-sm text-slate-300 mb-4">
              {t.errorBoundary.description}
            </p>
            <pre className="text-xs font-mono bg-slate-950 p-3 rounded text-left overflow-x-auto text-red-300 mb-4">
              {this.state.error?.message || t.common.unknown}
            </pre>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg text-sm transition-colors cursor-pointer"
            >
              Reset Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
