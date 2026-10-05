import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { InMemoryRateLimiter } from '@/lib/rate-limit';

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
