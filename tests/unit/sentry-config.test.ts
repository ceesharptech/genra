import { describe, it, expect } from 'vitest';
import {
  buildSentryClientConfig,
  buildSentryServerConfig,
  scrubSentryEvent,
  type SentryBeforeSendEvent,
} from '@/lib/monitoring/sentry-config';

describe('buildSentryClientConfig', () => {
  it('disables SDK when DSN is undefined or empty', () => {
    const config = buildSentryClientConfig({ dsn: undefined });
    expect(config.enabled).toBe(false);
  });

  it('enables SDK with production sample rate and replay disabled', () => {
    const config = buildSentryClientConfig({
      dsn: 'https://test@sentry.io/123',
      nodeEnv: 'production',
      vercelEnv: 'production',
      release: 'sha-abc-123',
    });

    expect(config.enabled).toBe(true);
    expect(config.tracesSampleRate).toBe(0.05);
    expect(config.replaysSessionSampleRate).toBe(0);
    expect(config.replaysOnErrorSampleRate).toBe(0);
    expect(config.environment).toBe('production');
    expect(config.release).toBe('sha-abc-123');
  });

  it('enables debug logging when debug is true', () => {
    const config = buildSentryClientConfig({
      dsn: 'https://test@sentry.io/123',
      debug: true,
    });
    expect(config.debug).toBe(true);
  });
});

describe('buildSentryServerConfig', () => {
  it('disables SDK when DSN is missing', () => {
    const config = buildSentryServerConfig({ dsn: '' });
    expect(config.enabled).toBe(false);
  });

  it('configures server environment properly', () => {
    const config = buildSentryServerConfig({
      dsn: 'https://test@sentry.io/123',
      nodeEnv: 'development',
    });
    expect(config.enabled).toBe(true);
    expect(config.tracesSampleRate).toBe(1.0);
  });
});

describe('scrubSentryEvent', () => {
  it('scrubs personal identity from user object', () => {
    const event = {
      user: {
        id: 'user-uuid-123',
        email: 'creator@example.com',
        username: 'supercreator',
        ip_address: '192.168.1.1',
      },
    } as unknown as SentryBeforeSendEvent;

    const scrubbed = scrubSentryEvent(event);
    expect(scrubbed?.user?.id).toBe('user-uuid-123');
    expect(scrubbed?.user?.email).toBeUndefined();
    expect(scrubbed?.user?.username).toBeUndefined();
    expect(scrubbed?.user?.ip_address).toBeUndefined();
  });

  it('scrubs sensitive tokens from request URL and headers', () => {
    const event = {
      request: {
        url: 'https://genra.dev/auth/callback?code=secret_oauth_code&token=secret_jwt',
        headers: {
          authorization: 'Bearer secret_token',
          cookie: 'sb-auth-token=secret',
          'x-real-ip': '1.2.3.4',
          'content-type': 'application/json',
        },
      },
    } as unknown as SentryBeforeSendEvent;

    const scrubbed = scrubSentryEvent(event);
    expect(scrubbed?.request?.url).toBe('https://genra.dev/auth/callback');
    expect(scrubbed?.request?.headers?.authorization).toBeUndefined();
    expect(scrubbed?.request?.headers?.cookie).toBeUndefined();
    expect(scrubbed?.request?.headers?.['x-real-ip']).toBeUndefined();
    expect(scrubbed?.request?.headers?.['content-type']).toBe('application/json');
  });

  it('scrubs query parameters from breadcrumbs', () => {
    const event = {
      breadcrumbs: [
        {
          category: 'navigation',
          data: {
            from: '/login?next=%2Fdashboard',
            to: '/discover?q=my_secret_query&sort=trending',
          },
        },
      ],
    } as unknown as SentryBeforeSendEvent;

    const scrubbed = scrubSentryEvent(event);
    expect(scrubbed?.breadcrumbs?.[0]?.data?.from).toBe('/login');
    expect(scrubbed?.breadcrumbs?.[0]?.data?.to).toBe('/discover?sort=trending&has_query=true');
  });

  it('returns null on null event', () => {
    expect(scrubSentryEvent(null)).toBeNull();
  });
});
