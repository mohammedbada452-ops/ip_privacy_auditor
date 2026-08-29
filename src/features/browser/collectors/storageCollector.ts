/**
 * Storage Capabilities Collector
 * Evaluates storage API availability without reading, modifying, or uploading user data.
 */

import type { BaseCollectorResult, StorageData } from '../types';

export function collectStorage(): BaseCollectorResult<StorageData> {
  const start = performance.now();

  try {
    const isBrowser = typeof window !== 'undefined';

    // 1. Cookies enabled
    const cookiesEnabled = isBrowser && typeof navigator !== 'undefined' && !!navigator.cookieEnabled;

    // 2. LocalStorage test (write-test-remove key)
    let localStorageAvailable = false;
    if (isBrowser && typeof window.localStorage !== 'undefined') {
      try {
        const testKey = `__audit_storage_test_${Math.random().toString(36).substring(2, 7)}`;
        window.localStorage.setItem(testKey, '1');
        localStorageAvailable = window.localStorage.getItem(testKey) === '1';
        window.localStorage.removeItem(testKey);
      } catch {
        localStorageAvailable = false;
      }
    }

    // 3. SessionStorage test
    let sessionStorageAvailable = false;
    if (isBrowser && typeof window.sessionStorage !== 'undefined') {
      try {
        const testKey = `__audit_session_test_${Math.random().toString(36).substring(2, 7)}`;
        window.sessionStorage.setItem(testKey, '1');
        sessionStorageAvailable = window.sessionStorage.getItem(testKey) === '1';
        window.sessionStorage.removeItem(testKey);
      } catch {
        sessionStorageAvailable = false;
      }
    }

    // 4. IndexedDB capability
    let indexedDbAvailable = false;
    if (isBrowser && typeof window.indexedDB !== 'undefined') {
      try {
        indexedDbAvailable = !!window.indexedDB;
      } catch {
        indexedDbAvailable = false;
      }
    }

    const data: StorageData = {
      cookiesEnabled,
      localStorageAvailable,
      sessionStorageAvailable,
      indexedDbAvailable,
    };

    return {
      id: 'storage_intelligence',
      category: 'STORAGE',
      supported: true,
      available: true,
      status: 'SUCCESS',
      confidence: 'HIGH',
      durationMs: performance.now() - start,
      data,
    };
  } catch (err: unknown) {
    return {
      id: 'storage_intelligence',
      category: 'STORAGE',
      supported: false,
      available: false,
      status: 'ERROR',
      confidence: 'LOW',
      durationMs: performance.now() - start,
      data: null,
      error: err instanceof Error ? err.message : 'Storage collection failed',
    };
  }
}
