import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, LANGUAGE_OPTIONS } from '../../i18n/LanguageContext';
import type { Language } from '../../i18n/types';
import { Globe, Check, ChevronDown } from 'lucide-react';

export interface LanguageSelectorProps {
  className?: string;
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  compact = false,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentOption = LANGUAGE_OPTIONS.find((opt) => opt.code === language) || LANGUAGE_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      <button
        type="button"
        id="language-selector-button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t.common.languageSelect}
        className={`inline-flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all duration-150 border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
          isOpen
            ? 'bg-slate-800 text-cyan-400 border-cyan-500/50 shadow-sm'
            : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:text-slate-100 hover:bg-slate-800'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-semibold uppercase">{currentOption.code}</span>
          {!compact && (
            <span className="hidden sm:inline text-slate-400 font-sans text-xs">
              {currentOption.nativeName}
            </span>
          )}
        </div>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={t.common.languageSelect}
          className="absolute right-0 rtl:right-auto rtl:left-0 mt-1.5 w-44 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl z-50 py-1.5 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
        >
          {LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = opt.code === language;
            return (
              <button
                key={opt.code}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.code)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left rtl:text-right text-xs transition-colors font-sans ${
                  isSelected
                    ? 'bg-cyan-500/15 text-cyan-400 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] uppercase text-slate-400 w-5">
                    {opt.code}
                  </span>
                  <span>{opt.nativeName}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
