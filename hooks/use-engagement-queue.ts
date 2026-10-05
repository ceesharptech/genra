'use client';

import {
  useState,
  useRef,
  useEffect,
  useTransition,
  useCallback,
  useOptimistic,
} from 'react';
import { toast } from 'sonner';

export interface UseEngagementQueueOptions {
  initialState: boolean;
  initialCount?: number;
  onCommit: (
    nextState: boolean
  ) => Promise<{ ok: boolean; data?: { count?: number }; error?: string }>;
  onRollback?: (previousState: boolean, previousCount?: number) => void;
}

export interface UseEngagementQueueReturn {
  state: boolean;
  count: number;
  isPending: boolean;
  toggle: () => void;
}

/**
 * Optimistic engagement state hook with a strict per-button concurrency queue.
 *
 * Guarantees:
 * 1. Immediate optimistic UI response with useOptimistic.
 * 2. At most ONE network request in-flight at any millisecond.
 * 3. Latest desired state always wins; rapid clicking cancels redundant intermediate requests.
 * 4. Automatic rollback and toast notifications on server action failures.
 */
export function useEngagementQueue({
  initialState,
  initialCount = 0,
  onCommit,
  onRollback,
}: UseEngagementQueueOptions): UseEngagementQueueReturn {
  const [confirmedState, setConfirmedState] = useState(initialState);
  const [confirmedCount, setConfirmedCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  const confirmedStateRef = useRef(initialState);
  const confirmedCountRef = useRef(initialCount);
  const latestDesiredState = useRef(initialState);
  const inFlight = useRef(false);

  // Sync refs with state outside render
  useEffect(() => {
    confirmedStateRef.current = confirmedState;
    confirmedCountRef.current = confirmedCount;
  }, [confirmedState, confirmedCount]);

  // React 19 optimistic state
  const [optimistic, setOptimistic] = useOptimistic(
    { state: confirmedState, count: confirmedCount },
    (
      current,
      update: { desiredState: boolean; countDelta: number }
    ) => ({
      state: update.desiredState,
      count: Math.max(0, current.count + update.countDelta),
    })
  );

  const drainQueue = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;

    try {
      while (latestDesiredState.current !== confirmedStateRef.current) {
        const targetState = latestDesiredState.current;
        const res = await onCommit(targetState);

        if (res.ok) {
          confirmedStateRef.current = targetState;
          setConfirmedState(targetState);
          if (typeof res.data?.count === 'number') {
            confirmedCountRef.current = res.data.count;
            setConfirmedCount(res.data.count);
          }
        } else {
          // Failure: roll back desired state to confirmed state
          const rolledBackState = confirmedStateRef.current;
          const rolledBackCount = confirmedCountRef.current;
          latestDesiredState.current = rolledBackState;

          startTransition(() => {
            setConfirmedState(rolledBackState);
            setConfirmedCount(rolledBackCount);
          });

          toast.error(res.error || 'Failed to update. Please try again.');
          onRollback?.(rolledBackState, rolledBackCount);
          break;
        }
      }
    } finally {
      inFlight.current = false;
      // If another click arrived while finalizing:
      if (latestDesiredState.current !== confirmedStateRef.current) {
        drainQueue();
      }
    }
  }, [onCommit, onRollback]);

  const toggle = useCallback(() => {
    const nextState = !latestDesiredState.current;
    latestDesiredState.current = nextState;

    const delta = nextState ? 1 : -1;
    startTransition(() => {
      setOptimistic({ desiredState: nextState, countDelta: delta });
    });

    drainQueue();
  }, [drainQueue, setOptimistic]);

  return {
    state: optimistic.state,
    count: optimistic.count,
    isPending,
    toggle,
  };
}
