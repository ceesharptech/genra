import 'server-only';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

/**
 * In-memory sliding-window rate limiter fallback for development, testing,
 * or when Upstash Redis credentials are not configured.
 */
interface RateLimitRecord {
  timestamps: number[];
}

export class InMemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private defaultTtlMs: number = 60_000) {
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.prune(), 120_000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

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

  public reset(key?: string): void {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }

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

// Global in-memory instance for fallback
const fallbackLimiter = new InMemoryRateLimiter(60_000);

// Named actions and standard sliding window limits
export type RateLimitAction =
  | 'like'
  | 'save'
  | 'copy_prompt'
  | 'view'
  | 'share'
  | 'save_creation'
  | 'publish_creation'
  | 'prompt_create'
  | 'prompt_fork'
  | 'prompt_crud'
  | 'resource_create'
  | 'resource_crud'
  | 'create_collection'
  | 'collection_crud'
  | 'collection_add_item'
  | 'collection_item'
  | 'propose_tool'
  | 'report'
  | 'csp_report';

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMIT_CONFIGS: Record<RateLimitAction, RateLimitConfig> = {
  like: { limit: 60, windowSeconds: 60 },
  save: { limit: 60, windowSeconds: 60 },
  copy_prompt: { limit: 30, windowSeconds: 60 },
  view: { limit: 120, windowSeconds: 60 },
  share: { limit: 30, windowSeconds: 60 },
  save_creation: { limit: 30, windowSeconds: 60 },
  publish_creation: { limit: 10, windowSeconds: 60 },
  prompt_create: { limit: 20, windowSeconds: 60 },
  prompt_fork: { limit: 15, windowSeconds: 60 },
  prompt_crud: { limit: 30, windowSeconds: 60 },
  resource_create: { limit: 20, windowSeconds: 60 },
  resource_crud: { limit: 30, windowSeconds: 60 },
  create_collection: { limit: 20, windowSeconds: 60 },
  collection_crud: { limit: 30, windowSeconds: 60 },
  collection_add_item: { limit: 60, windowSeconds: 60 },
  collection_item: { limit: 60, windowSeconds: 60 },
  propose_tool: { limit: 10, windowSeconds: 60 },
  report: { limit: 10, windowSeconds: 3600 },
  csp_report: { limit: 60, windowSeconds: 60 },
};

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // milliseconds until reset
}

let redisClient: Redis | null = null;
const upstashLimiters = new Map<string, Ratelimit>();

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis({
      url,
      token,
    });
  }

  return redisClient;
}

function getUpstashLimiter(action: RateLimitAction, config: RateLimitConfig): Ratelimit | null {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  const cacheKey = `${action}:${config.limit}:${config.windowSeconds}`;
  let limiter = upstashLimiters.get(cacheKey);

  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
      analytics: false,
      prefix: `genra:ratelimit:${action}`,
    });
    upstashLimiters.set(cacheKey, limiter);
  }

  return limiter;
}

/**
 * Checks whether an action for a given identifier is permitted.
 * Backed by Upstash Redis in production, falling back to an in-memory sliding window
 * when credentials are not configured or in local development.
 *
 * Implements FAIL-OPEN resilience: if Upstash Redis encounters a network error or outage,
 * the request is permitted and a warning is logged so the application never breaks.
 */
export async function checkRateLimit(
  action: RateLimitAction,
  identifier: string
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[action] ?? { limit: 60, windowSeconds: 60 };
  const upstashLimiter = getUpstashLimiter(action, config);

  if (upstashLimiter) {
    try {
      const result = await upstashLimiter.limit(identifier);
      return {
        success: result.success,
        remaining: result.remaining,
        reset: Math.max(0, result.reset - Date.now()),
      };
    } catch (error) {
      // Fail open to ensure Redis connectivity/quota issues do not break critical user flows
      console.warn(`[RateLimit] Upstash Redis check failed for ${action}:${identifier}; failing open`, error);
      return {
        success: true,
        remaining: 1,
        reset: 0,
      };
    }
  }

  // Fallback to in-memory sliding window rate limiter
  const windowMs = config.windowSeconds * 1000;
  const inMemoryResult = fallbackLimiter.check(`${action}:${identifier}`, config.limit, windowMs);

  return {
    success: inMemoryResult.allowed,
    remaining: inMemoryResult.remaining,
    reset: inMemoryResult.resetMs,
  };
}

// Backward-compatible named limiters
export const engagementRateLimiter = fallbackLimiter;
export const shareRateLimiter = fallbackLimiter;
export const libraryRateLimiter = fallbackLimiter;
export const collectionsRateLimiter = fallbackLimiter;
