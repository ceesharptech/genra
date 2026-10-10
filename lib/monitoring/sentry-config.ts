import type { BrowserOptions } from '@sentry/nextjs';
import { sanitizeUrl } from '@/lib/analytics/scrubber';

export const SENTRY_IGNORE_ERRORS = [
  'NEXT_REDIRECT',
  'NEXT_NOT_FOUND',
  'ResizeObserver loop limit exceeded',
  'AbortError',
  'Network request failed',
];

export interface SentryEnvInput {
  dsn?: string;
  nodeEnv?: string;
  vercelEnv?: string;
  release?: string;
  debug?: boolean;
}

export type SentryBeforeSendEvent = Parameters<NonNullable<BrowserOptions['beforeSend']>>[0];

/**
 * Strips personal data and sensitive parameters from Sentry events before dispatch.
 */
export function scrubSentryEvent(event: SentryBeforeSendEvent | null): SentryBeforeSendEvent | null {
  if (!event) return null;

  // 1. Strip personal identity, leaving only user.id (UUID)
  if (event.user && typeof event.user === 'object') {
    delete event.user.email;
    delete event.user.username;
    delete event.user.ip_address;
  }

  // 2. Scrub request URL and headers
  if (event.request && typeof event.request === 'object') {
    if (typeof event.request.url === 'string') {
      event.request.url = sanitizeUrl(event.request.url);
    }
    if (event.request.headers && typeof event.request.headers === 'object') {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
      delete event.request.headers['x-forwarded-for'];
      delete event.request.headers['x-real-ip'];
    }
  }

  // 3. Scrub breadcrumb URLs
  if (Array.isArray(event.breadcrumbs)) {
    for (const crumb of event.breadcrumbs) {
      if (crumb && crumb.data && typeof crumb.data === 'object') {
        if (typeof crumb.data.url === 'string') {
          crumb.data.url = sanitizeUrl(crumb.data.url);
        }
        if (typeof crumb.data.to === 'string') {
          crumb.data.to = sanitizeUrl(crumb.data.to);
        }
        if (typeof crumb.data.from === 'string') {
          crumb.data.from = sanitizeUrl(crumb.data.from);
        }
      }
    }
  }

  return event;
}

/**
 * Builds Sentry client options for browser runtime.
 */
export function buildSentryClientConfig(env: SentryEnvInput) {
  const dsn = env.dsn;
  const isProd = env.nodeEnv === 'production';
  const environment = env.vercelEnv || env.nodeEnv || 'development';
  const release = env.release;
  const debug = Boolean(env.debug);

  return {
    dsn,
    enabled: Boolean(dsn),
    environment,
    release,
    tracesSampleRate: isProd ? 0.05 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    debug,
    ignoreErrors: SENTRY_IGNORE_ERRORS,
    beforeSend: scrubSentryEvent,
  };
}

/**
 * Builds Sentry server/edge options for Node.js and Edge runtimes.
 */
export function buildSentryServerConfig(env: SentryEnvInput) {
  const dsn = env.dsn;
  const isProd = env.nodeEnv === 'production';
  const environment = env.vercelEnv || env.nodeEnv || 'development';
  const release = env.release;
  const debug = Boolean(env.debug);

  return {
    dsn,
    enabled: Boolean(dsn),
    environment,
    release,
    tracesSampleRate: isProd ? 0.05 : 1.0,
    debug,
    ignoreErrors: SENTRY_IGNORE_ERRORS,
    beforeSend: scrubSentryEvent,
  };
}
