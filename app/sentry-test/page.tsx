'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';

export default function SentryTestPage() {
  const [triggered, setTriggered] = useState(false);

  const handleTriggerError = () => {
    setTriggered(true);
    try {
      throw new Error('Test Sentry Error from Genra SentryTestPage');
    } catch (err) {
      Sentry.captureException(err);
      console.error('[Sentry Test Triggered]', err);
    }
  };

  return (
    <div className="container mx-auto max-w-md py-16 px-4 text-center">
      <h1 className="font-bricolage text-2xl font-bold mb-4">
        Sentry Integration Diagnostics
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Click below to dispatch a non-fatal test exception to Sentry for
        verification.
      </p>
      <Button
        variant="outline"
        onClick={handleTriggerError}
        className="rounded-full"
      >
        Trigger Sentry Test Exception
      </Button>
      {triggered && (
        <p className="mt-4 text-xs text-brand font-medium">
          Captured and dispatched test event.
        </p>
      )}
    </div>
  );
}
