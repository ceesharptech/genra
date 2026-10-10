import type { ConfigDefaults } from 'posthog-js';
import { scrubEventUrls } from './scrubber';

export interface PostHogInitEnv {
  key?: string;
  host?: string;
  debug?: boolean;
  nodeEnv?: string;
}

export interface PostHogClientOptions {
  api_host: string;
  ui_host: string;
  defaults: ConfigDefaults;
  persistence: 'localStorage+cookie';
  autocapture: boolean;
  capture_pageleave: boolean;
  disable_session_recording: boolean;
  person_profiles: 'identified_only';
  respect_dnt: boolean;
  before_send: typeof scrubEventUrls;
}

export interface PostHogConfig {
  key: string;
  options: PostHogClientOptions;
  debug: boolean;
}

/**
 * Builds the PostHog client initialization configuration.
 *
 * Rules:
 * 1. Missing or blank key -> returns null (nothing initialized).
 * 2. In development (`nodeEnv === 'development'`), disabled unless `debug === true`.
 * 3. In production, enabled with standard defaults, reverse proxy at `/ingest`,
 *    default browser persistence (`localStorage+cookie`), session replay disabled,
 *    and URL parameter scrubbing.
 */
export function buildPostHogConfig(env: PostHogInitEnv): PostHogConfig | null {
  const { key, host, debug = false, nodeEnv = 'development' } = env;

  if (!key || typeof key !== 'string' || key.trim() === '') {
    return null;
  }

  // Disabled in development unless debug is explicitly enabled
  if (nodeEnv === 'development' && !debug) {
    return null;
  }

  const uiHost = host || 'https://eu.i.posthog.com';

  return {
    key: key.trim(),
    options: {
      api_host: '/ingest',
      ui_host: uiHost,
      defaults: '2026-05-30' as ConfigDefaults,
      persistence: 'localStorage+cookie',
      autocapture: false,
      capture_pageleave: true,
      disable_session_recording: true,
      person_profiles: 'identified_only',
      respect_dnt: true,
      before_send: scrubEventUrls,
    },
    debug,
  };
}
