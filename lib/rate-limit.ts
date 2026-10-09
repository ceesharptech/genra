/**
 * In-memory sliding-window rate limiter for server actions.
 *
 * NOTE: This rate limiter operates per-server instance (in-memory).
 * It provides best-effort abuse protection in development and single-instance deployments.
 * In Phase 07 (Production Readiness), this will be replaced with a distributed Redis/Upstash rate limiter.
 */

interface RateLimitRecord {
  timestamps: number[];
}

export class InMemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private defaultTtlMs: number = 60_000) {
    // Periodic garbage collection every 2 minutes in long-running processes
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.prune(), 120_000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  /**
   * Checks whether an action for a given identifier is permitted within the sliding window.
   *
   * @param key Unique key (e.g. `${userId}:${action}`)
   * @param limit Maximum allowed requests within the window
   * @param windowMs Duration of the sliding window in milliseconds (default 60,000 ms)
   * @returns { allowed: boolean, remaining: number, resetMs: number }
   */
  public check(
    key: string,
    limit: number,
    windowMs: number = this.defaultTtlMs
  ): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    const cutoff = now - windowMs;

    let record = this.store.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(key, record);
    }

    // Filter out timestamps outside the current sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > cutoff);

    if (record.timestamps.length >= limit) {
      const oldestInWindow = record.timestamps[0];
      const resetMs = Math.max(0, oldestInWindow + windowMs - now);
      return {
        allowed: false,
        remaining: 0,
        resetMs,
      };
    }

    record.timestamps.push(now);
    const remaining = limit - record.timestamps.length;
    return {
      allowed: true,
      remaining,
      resetMs: windowMs,
    };
  }

  /**
   * Resets rate limit for a specific key (useful for tests or admin resets).
   */
  public reset(key?: string): void {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }

  /**
   * Prunes stale entries from memory.
   */
  public prune(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter(
        (ts) => now - ts < this.defaultTtlMs
      );
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Global default instance for engagement actions
export const engagementRateLimiter = new InMemoryRateLimiter(60_000);

// Global default instance for share actions
export const shareRateLimiter = new InMemoryRateLimiter(60_000);
