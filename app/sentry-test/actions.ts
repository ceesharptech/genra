'use server';

import * as Sentry from '@sentry/nextjs';
import { validateSentryTestToken } from '@/lib/monitoring/token-gate';

export async function triggerServerActionError(token: string) {
  if (!validateSentryTestToken(token)) {
    throw new Error('Unauthorized');
  }

  const error = new Error('Intentional test Server Action error for Sentry verification');
  Sentry.captureException(error, {
    tags: { test_type: 'server_action' },
  });
  throw error;
}

export async function triggerServerActionMessage(token: string) {
  if (!validateSentryTestToken(token)) {
    throw new Error('Unauthorized');
  }

  const eventId = Sentry.captureMessage(
    'Intentional test Server Action message for Sentry verification',
    {
      level: 'info',
      tags: { test_type: 'server_message' },
    }
  );

  return { success: true, eventId };
}
