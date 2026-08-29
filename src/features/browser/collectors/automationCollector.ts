/**
 * Automation & Headless Driver Collector
 * Inspects navigator.webdriver, known automation window globals, and headless signatures.
 * Performs passive detection without altering browser properties.
 */

import type { BaseCollectorResult, AutomationData, AutomationStatus, ConfidenceLevel } from '../types';

export function collectAutomation(): BaseCollectorResult<AutomationData> {
  const start = performance.now();

  try {
    const isBrowser = typeof window !== 'undefined';
    if (!isBrowser || typeof navigator === 'undefined') {
      return {
        id: 'automation_driver',
        category: 'AUTOMATION',
        supported: false,
        available: false,
        status: 'UNAVAILABLE',
        confidence: 'HIGH',
        durationMs: performance.now() - start,
        data: {
          status: 'UNKNOWN',
          isAutomation: false,
          isWebDriver: false,
          automationSignals: [],
          confidence: 'LOW',
        },
      };
    }

    const signals: string[] = [];

    // 1. Direct navigator.webdriver check
    const isWebDriver = !!navigator.webdriver;
    if (isWebDriver) {
      signals.push('navigator.webdriver=true');
    }

    // 2. Window automation globals
    const win = window as any;
    if (win._phantom || win.callPhantom) signals.push('PhantomJS global detected');
    if (win.__selenium_evaluate || win.__webdriver_evaluate || win.__driver_evaluate) signals.push('Selenium global detected');
    if (win.__nightmare) signals.push('NightmareJS global detected');
    if (win.domAutomation || win.domAutomationController) signals.push('DOM Automation controller detected');
    if (win.Cypress) signals.push('Cypress test framework global detected');
    if (win.__playwright) signals.push('Playwright global detected');

    // 3. User-Agent Headless keywords
    const ua = navigator.userAgent || '';
    if (/HeadlessChrome/i.test(ua)) {
      signals.push('HeadlessChrome user-agent detected');
    }

    // 4. Missing plugins with Chrome UA heuristic (suspicious only)
    if (/Chrome/i.test(ua) && navigator.plugins && navigator.plugins.length === 0 && !/Mobile/i.test(ua)) {
      signals.push('Zero plugins reported on desktop Chrome');
    }

    let status: AutomationStatus = 'NOT_DETECTED';
    let confidence: ConfidenceLevel = 'HIGH';
    let isAutomation = false;

    if (isWebDriver || signals.some((s) => s.includes('Selenium') || s.includes('HeadlessChrome'))) {
      status = 'DETECTED';
      isAutomation = true;
      confidence = 'HIGH';
    } else if (signals.length > 0) {
      status = 'SUSPECTED';
      isAutomation = true;
      confidence = 'MEDIUM';
    } else {
      status = 'NOT_DETECTED';
      isAutomation = false;
      confidence = 'HIGH';
    }

    const data: AutomationData = {
      status,
      isAutomation,
      isWebDriver,
      automationSignals: signals,
      confidence,
    };

    return {
      id: 'automation_driver',
      category: 'AUTOMATION',
      supported: true,
      available: true,
      status: 'SUCCESS',
      confidence,
      durationMs: performance.now() - start,
      data,
    };
  } catch (err: unknown) {
    return {
      id: 'automation_driver',
      category: 'AUTOMATION',
      supported: false,
      available: false,
      status: 'ERROR',
      confidence: 'LOW',
      durationMs: performance.now() - start,
      data: {
        status: 'UNKNOWN',
        isAutomation: false,
        isWebDriver: false,
        automationSignals: [],
        confidence: 'LOW',
      },
      error: err instanceof Error ? err.message : 'Automation collection failed',
    };
  }
}
