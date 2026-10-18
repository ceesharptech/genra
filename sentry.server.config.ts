import * as Sentry from '@sentry/nextjs';
import { buildSentryServerConfig } from '@/lib/monitoring/sentry-config';

const config = buildSentryServerConfig({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: process.env.VERCEL_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  debug: process.env.SENTRY_DEBUG === 'true',
});

if (config.enabled) {
  Sentry.init(config);
}
