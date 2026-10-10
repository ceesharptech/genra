'use client';

import React, { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

    if (!key || typeof window === 'undefined') return;

    if (!posthog.__loaded) {
      posthog.init(key, {
        api_host: '/ingest',
        ui_host: host,
        persistence: 'memory', // Cookieless: in-memory only (no cookies / localStorage)
        autocapture: false, // Strict privacy: no autocapture of DOM / clicks
        capture_pageview: false, // Pageviews captured intentionally with sanitized paths
        capture_pageleave: false,
        disable_session_recording: true, // Strict privacy: session replay completely disabled
        person_profiles: 'identified_only',
      });
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
