/**
 * Lightweight in-app analytics event stub.
 * In Phase 05, this logs structured events and keeps clean extension seams
 * ready for Phase 07 telemetry providers (PostHog, Plausible, etc.).
 */

export interface AnalyticsEventMap {
  landing_from_share: {
    channel: string;
    path: string;
    creationId?: string;
  };
  share_click: {
    channel: string;
    creationId: string;
  };
}

export function track<K extends keyof AnalyticsEventMap>(
  event: K,
  properties: AnalyticsEventMap[K]
): void {
  if (typeof window !== 'undefined') {
    // Client-side execution
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[Analytics] ${event}:`, properties);
    }
  }
}
