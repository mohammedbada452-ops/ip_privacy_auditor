import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface FocusTrapOptions {
  active: boolean;
  onEscape?: () => void;
  initialFocusSelector?: string;
}

/**
 * Keeps keyboard focus inside a modal/dialog while open and restores focus
 * to the control that opened it when the dialog closes.
 */
export const useFocusTrap = <T extends HTMLElement = HTMLElement>({
  active,
  onEscape,
  initialFocusSelector,
}: FocusTrapOptions) => {
  const containerRef = useRef<T | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const container = containerRef.current;
    const focusInitial = () => {
      const preferred = initialFocusSelector
        ? container.querySelector<HTMLElement>(initialFocusSelector)
        : null;
      const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (preferred || firstFocusable || container).focus();
    };

    const focusables = () => Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = focusables();
      if (elements.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    focusInitial();
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const restoreTarget = previouslyFocusedRef.current;
      if (restoreTarget && document.contains(restoreTarget)) {
        window.requestAnimationFrame(() => restoreTarget.focus());
      }
    };
  }, [active, initialFocusSelector, onEscape]);

  return containerRef;
};
