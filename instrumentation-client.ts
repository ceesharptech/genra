import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';
import { buildPostHogConfig } from '@/lib/analytics/config';
import { buildSentryClientConfig } from '@/lib/monitoring/sentry-config';

// 1. Sentry Client Initialization
const sentryConfig = buildSentryClientConfig({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
  release:
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA,
  debug:
    process.env.NEXT_PUBLIC_SENTRY_DEBUG === 'true' ||
    process.env.SENTRY_DEBUG === 'true',
});

if (sentryConfig.enabled) {
  Sentry.init(sentryConfig);
}

// App Router navigation tracking
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// 2. PostHog Client Initialization (single client initialization point)
if (typeof window !== 'undefined') {
  const phConfig = buildPostHogConfig({
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    debug: process.env.NEXT_PUBLIC_POSTHOG_DEBUG === 'true',
    nodeEnv: process.env.NODE_ENV,
  });

  if (phConfig && !posthog.__loaded) {
    posthog.init(phConfig.key, phConfig.options);
    if (phConfig.debug) {
      posthog.debug();
    }
  }
}
