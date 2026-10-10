import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { InMemoryRateLimiter, checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

describe('InMemoryRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests within limit', () => {
    const limiter = new InMemoryRateLimiter(60000);
    const key = 'user-1:like';

    for (let i = 0; i < 5; i++) {
      const res = limiter.check(key, 5);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(5 - (i + 1));
    }
  });

  it('blocks requests exceeding limit within the window', () => {
    const limiter = new InMemoryRateLimiter(60000);
    const key = 'user-2:like';

    // Consume all 3 allowed requests
    limiter.check(key, 3);
    limiter.check(key, 3);
    limiter.check(key, 3);

    // 4th request exceeds limit
    const res = limiter.check(key, 3);
    expect(res.allowed).toBe(false);
    expect(res.remaining).toBe(0);
    expect(res.resetMs).toBeGreaterThan(0);
  });

  it('resets window after elapsed duration', () => {
    const limiter = new InMemoryRateLimiter(60000);
    const key = 'user-3:save';

    limiter.check(key, 1);
    const blocked = limiter.check(key, 1);
    expect(blocked.allowed).toBe(false);

    // Advance time past the 60s window
    vi.advanceTimersByTime(60001);

    const allowedAgain = limiter.check(key, 1);
    expect(allowedAgain.allowed).toBe(true);
    expect(allowedAgain.remaining).toBe(0);
  });

  it('tracks different keys independently', () => {
    const limiter = new InMemoryRateLimiter(60000);

    limiter.check('user-a', 1);
    expect(limiter.check('user-a', 1).allowed).toBe(false);

    expect(limiter.check('user-b', 1).allowed).toBe(true);
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('has configurations for all named actions', () => {
    expect(RATE_LIMIT_CONFIGS.like.limit).toBe(60);
    expect(RATE_LIMIT_CONFIGS.save.limit).toBe(60);
    expect(RATE_LIMIT_CONFIGS.copy_prompt.limit).toBe(30);
    expect(RATE_LIMIT_CONFIGS.view.limit).toBe(120);
    expect(RATE_LIMIT_CONFIGS.share.limit).toBe(30);
    expect(RATE_LIMIT_CONFIGS.save_creation.limit).toBe(30);
    expect(RATE_LIMIT_CONFIGS.publish_creation.limit).toBe(10);
    expect(RATE_LIMIT_CONFIGS.propose_tool.limit).toBe(10);
  });

  it('allows actions within configured limit in fallback mode', async () => {
    const res = await checkRateLimit('propose_tool', 'user-test-1');
    expect(res.success).toBe(true);
    expect(res.remaining).toBe(9);
  });

  it('blocks actions when limit is exceeded in fallback mode', async () => {
    const userId = 'user-test-blocked';
    for (let i = 0; i < 10; i++) {
      const res = await checkRateLimit('propose_tool', userId);
      expect(res.success).toBe(true);
    }

    const exceeded = await checkRateLimit('propose_tool', userId);
    expect(exceeded.success).toBe(false);
    expect(exceeded.remaining).toBe(0);
    expect(exceeded.reset).toBeGreaterThan(0);
  });
});
