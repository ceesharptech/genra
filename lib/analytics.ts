import posthog from 'posthog-js';

/**
 * Genra Analytics Telemetry Module (Client & Universal).
 *
 * Privacy Guarantees:
 * 1. Default browser persistence (localStorage+cookie) for reliable web analytics (visitors, sessions, bounce rate).
 * 2. Anonymity: users identified by UUID only; never emails, names, or IPs.
 * 3. Clean payloads: only structured metadata (IDs, categories, channels); NO free text, prompt contents, or secret query params.
 * 4. URL Scrubbing: automatic pageview URLs stripped of sensitive tokens (code, next, intent, etc.) and search text replaced with has_query=true.
 * 5. Reverse Proxied: routed through /ingest to avoid adblockers and 3rd party connections.
 * 6. Fail-Safe: missing credentials or network errors never disrupt user interactions.
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
  creation_publish: {
    creationId: string;
    category: string;
  };
  prompt_copy: {
    promptId: string;
  };
  collection_create: {
    collectionId: string;
  };
  like_toggle: {
    creationId: string;
    action: 'like' | 'unlike';
  };
  save_toggle: {
    creationId: string;
    action: 'save' | 'unsave';
  };
  report_submitted: {
    targetType: string;
    reason: string;
  };
}

export function track<K extends keyof AnalyticsEventMap>(
  event: K,
  properties: AnalyticsEventMap[K]
): void {
  try {
    if (typeof window !== 'undefined') {
      // Client-side capture
      if (posthog.__loaded) {
        posthog.capture(event, properties);
      } else if (process.env.NODE_ENV !== 'production') {
        console.debug(`[Analytics:Client] ${event}:`, properties);
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Analytics Error]', err);
    }
  }
}

export function identifyUser(userId: string): void {
  try {
    if (typeof window !== 'undefined') {
      if (posthog.__loaded) {
        posthog.identify(userId);
      }
    }
  } catch {
    // Fail silently
  }
}

export function resetUser(): void {
  try {
    if (typeof window !== 'undefined') {
      if (posthog.__loaded) {
        posthog.reset();
      }
    }
  } catch {
    // Fail silently
  }
}
