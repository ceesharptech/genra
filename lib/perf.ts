/**
 * Dev-only performance logging helper.
 * Never logs secrets or full payloads, only execution timings.
 */
export function perfLog(tag: string, durationMs: number) {
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[Perf] ${tag}: ${durationMs.toFixed(1)}ms`);
  }
}

export async function timeAsync<T>(tag: string, fn: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV === "production") {
    return await fn();
  }
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const end = performance.now();
    perfLog(tag, end - start);
  }
}
