type MetricName = "LCP" | "CLS" | "INP";

const reported = new Set<MetricName>();

function reportMetric(name: MetricName, value: number, unit: "ms" | "score"): void {
  if (reported.has(name) || !Number.isFinite(value)) return;
  reported.add(name);
  if (import.meta.env.DEV) console.debug("[PrivaSec Performance]", { name, value: unit === "ms" ? Math.round(value) : Number(value.toFixed(4)), unit });
}

export function installPerformanceObservers(): () => void {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return () => {};
  const observers: PerformanceObserver[] = [];

  try {
    if (PerformanceObserver.supportedEntryTypes?.includes("largest-contentful-paint")) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntry | undefined;
        if (last) reportMetric("LCP", last.startTime, "ms");
      });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(observer);
    }
  } catch {}

  try {
    if (PerformanceObserver.supportedEntryTypes?.includes("layout-shift")) {
      let cls = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceEntry[]) {
          const candidate = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
          if (!candidate.hadRecentInput && typeof candidate.value === "number") cls += candidate.value;
        }
        reportMetric("CLS", cls, "score");
      });
      observer.observe({ type: "layout-shift", buffered: true });
      observers.push(observer);
    }
  } catch {}

  try {
    if (PerformanceObserver.supportedEntryTypes?.includes("event")) {
      let maxInteractionDuration = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceEntry[]) {
          const duration = entry.duration;
          if (Number.isFinite(duration)) {
            maxInteractionDuration = Math.max(maxInteractionDuration, duration);
          }
        }
        if (maxInteractionDuration > 0) reportMetric("INP", maxInteractionDuration, "ms");
      });
      observer.observe({ type: "event", buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
      observers.push(observer);
    }
  } catch {}

  return () => observers.forEach((observer) => observer.disconnect());
}
