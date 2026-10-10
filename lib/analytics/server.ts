import 'server-only';
import { PostHog } from 'posthog-node';
import type { AnalyticsEventMap } from '../analytics';

let serverPostHog: PostHog | null = null;

export function getServerPostHog(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  if (!serverPostHog) {
    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
    serverPostHog = new PostHog(key, {
      host,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return serverPostHog;
}

export function trackServer<K extends keyof AnalyticsEventMap>(
  event: K,
  properties: AnalyticsEventMap[K],
  distinctId: string = 'server-anonymous'
): void {
  try {
    const ph = getServerPostHog();
    if (ph) {
      ph.capture({
        distinctId,
        event,
        properties,
      });
    } else if (process.env.NODE_ENV !== 'production') {
      console.debug(`[Analytics:Server] ${event}:`, properties);
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Analytics Server Error]', err);
    }
  }
}
