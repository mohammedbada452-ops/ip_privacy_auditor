/**
 * Timeout & Execution Isolation Helper
 * Stage 8 Browser Intelligence
 */

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallbackValueOrFactory: T | (() => T)
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      const fallback =
        typeof fallbackValueOrFactory === 'function'
          ? (fallbackValueOrFactory as () => T)()
          : fallbackValueOrFactory;
      resolve(fallback);
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
