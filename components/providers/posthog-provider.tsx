'use client';

import React from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

interface PostHogProviderProps {
  children: React.ReactNode;
}

/**
 * PostHog Provider wrapping the React tree.
 * Client initialization is managed exclusively in `instrumentation-client.ts`.
 */
export function PostHogProvider({ children }: PostHogProviderProps) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
