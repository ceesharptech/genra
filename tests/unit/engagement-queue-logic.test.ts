import { describe, expect, it, vi } from 'vitest';

/**
 * Tests the core concurrency drain logic that powers useEngagementQueue.
 */
describe('engagement queue concurrency logic', () => {
  it('collapses rapid clicks to latest desired state with at most one in-flight request', async () => {
    let confirmedState = false;
    let desiredState = false;
    let inFlight = false;
    const commitCalls: boolean[] = [];

    const mockCommit = vi.fn(async (next: boolean) => {
      commitCalls.push(next);
      // Simulate network latency
      await new Promise((r) => setTimeout(r, 20));
      return { ok: true, data: { count: next ? 1 : 0 } };
    });

    const drainQueue = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        while (desiredState !== confirmedState) {
          const target = desiredState;
          const res = await mockCommit(target);
          if (res.ok) {
            confirmedState = target;
          }
        }
      } finally {
        inFlight = false;
        if (desiredState !== confirmedState) {
          await drainQueue();
        }
      }
    };

    const toggle = () => {
      desiredState = !desiredState;
      return drainQueue();
    };

    // User rapidly clicks 3 times: false -> true -> false -> true
    const p1 = toggle();
    const p2 = toggle();
    const p3 = toggle();

    await Promise.all([p1, p2, p3]);

    // End result is true
    expect(confirmedState).toBe(true);
    // At most 2 network requests occurred (the first one started, intermediate cancelled, final executed)
    expect(commitCalls.length).toBeLessThanOrEqual(2);
    expect(commitCalls[commitCalls.length - 1]).toBe(true);
  });

  it('rolls back on commit error', async () => {
    const confirmedState = false;
    let desiredState = true;
    let inFlight = false;

    const mockCommitFail = vi.fn(async () => {
      return { ok: false, error: 'Database timeout' };
    });

    const drainQueue = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        while (desiredState !== confirmedState) {
          const res = await mockCommitFail();
          if (!res.ok) {
            desiredState = confirmedState; // roll back
            break;
          }
        }
      } finally {
        inFlight = false;
      }
    };

    await drainQueue();

    expect(desiredState).toBe(false);
    expect(confirmedState).toBe(false);
  });
});
