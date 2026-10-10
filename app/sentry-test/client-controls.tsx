'use client';

import React, { useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import {
  triggerServerActionError,
  triggerServerActionMessage,
} from './actions';

interface ClientControlsProps {
  token: string;
}

export function ClientControls({ token }: ClientControlsProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. Client-side Error
  const handleClientError = () => {
    setStatus('Dispatching client-side exception...');
    try {
      throw new Error('Intentional test Client Error from Genra Sentry Test Page');
    } catch (err) {
      const id = Sentry.captureException(err, {
        tags: { test_type: 'client_exception' },
      });
      setStatus(`Client exception dispatched (ID: ${id})`);
    }
  };

  // 2. Server Action Error
  const handleServerActionError = async () => {
    setLoading(true);
    setStatus('Invoking Server Action with intentional error...');
    try {
      await triggerServerActionError(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus(`Server Action threw error: ${message || 'Error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  // 3. Plain Message
  const handlePlainMessage = async () => {
    setLoading(true);
    setStatus('Dispatching plain message...');
    try {
      const clientMsgId = Sentry.captureMessage(
        'Intentional test client message from Genra Sentry Test Page',
        {
          level: 'info',
          tags: { test_type: 'client_message' },
        }
      );
      const serverRes = await triggerServerActionMessage(token);
      setStatus(
        `Dispatched client message (ID: ${clientMsgId}) and server message (ID: ${serverRes.eventId})`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus(`Error sending message: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // 4. API Route Server Error
  const handleApiServerError = async () => {
    setLoading(true);
    setStatus('Triggering API route unhandled server exception...');
    try {
      const res = await fetch(
        `/api/sentry-test?token=${encodeURIComponent(token)}&kind=server`
      );
      if (res.status === 500) {
        setStatus('API route successfully returned 500 (captured by onRequestError)');
      } else {
        setStatus(`API route responded with status: ${res.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus(`API request completed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          onClick={handleClientError}
          disabled={loading}
          className="w-full"
        >
          1. Trigger Client Error
        </Button>

        <Button
          variant="outline"
          onClick={handleServerActionError}
          disabled={loading}
          className="w-full"
        >
          2. Trigger Server Action Error
        </Button>

        <Button
          variant="outline"
          onClick={handlePlainMessage}
          disabled={loading}
          className="w-full"
        >
          3. Send Plain Message
        </Button>

        <Button
          variant="outline"
          onClick={handleApiServerError}
          disabled={loading}
          className="w-full"
        >
          4. Trigger API Route Error
        </Button>
      </div>

      {status && (
        <div className="p-3 text-xs rounded-md bg-muted text-muted-foreground font-mono break-all">
          {status}
        </div>
      )}
    </div>
  );
}
