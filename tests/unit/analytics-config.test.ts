import { describe, it, expect } from 'vitest';
import { buildPostHogConfig } from '@/lib/analytics/config';

describe('buildPostHogConfig', () => {
  it('returns null when API key is missing or empty', () => {
    expect(buildPostHogConfig({ key: '', nodeEnv: 'production' })).toBeNull();
    expect(buildPostHogConfig({ key: undefined, nodeEnv: 'production' })).toBeNull();
    expect(buildPostHogConfig({ key: '   ', nodeEnv: 'production' })).toBeNull();
  });

  it('returns null in development when debug is false or omitted', () => {
    expect(
      buildPostHogConfig({
        key: 'phc_test_key_123',
        nodeEnv: 'development',
        debug: false,
      })
    ).toBeNull();

    expect(
      buildPostHogConfig({
        key: 'phc_test_key_123',
        nodeEnv: 'development',
      })
    ).toBeNull();
  });

  it('returns active config in development when debug is true', () => {
    const config = buildPostHogConfig({
      key: 'phc_test_key_123',
      nodeEnv: 'development',
      debug: true,
    });

    expect(config).not.toBeNull();
    expect(config?.key).toBe('phc_test_key_123');
    expect(config?.debug).toBe(true);
    expect(config?.options.api_host).toBe('/ingest');
    expect(config?.options.persistence).toBe('localStorage+cookie');
    expect(config?.options.autocapture).toBe(false);
    expect(config?.options.capture_pageleave).toBe(true);
    expect(config?.options.disable_session_recording).toBe(true);
    expect(config?.options.person_profiles).toBe('identified_only');
    expect(config?.options.respect_dnt).toBe(true);
    expect(typeof config?.options.before_send).toBe('function');
  });

  it('returns active config in production with proper defaults', () => {
    const config = buildPostHogConfig({
      key: 'phc_live_prod_key',
      host: 'https://eu.i.posthog.com',
      nodeEnv: 'production',
      debug: false,
    });

    expect(config).not.toBeNull();
    expect(config?.key).toBe('phc_live_prod_key');
    expect(config?.debug).toBe(false);
    expect(config?.options.api_host).toBe('/ingest');
    expect(config?.options.ui_host).toBe('https://eu.i.posthog.com');
    expect(config?.options.defaults).toBe('2026-05-30');
    expect(config?.options.persistence).toBe('localStorage+cookie');
    expect(config?.options.autocapture).toBe(false);
    expect(config?.options.capture_pageleave).toBe(true);
    expect(config?.options.disable_session_recording).toBe(true);
  });
});
