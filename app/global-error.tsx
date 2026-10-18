'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground font-sans p-4">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-xl font-bold">Something went critically wrong</h2>
          <p className="text-sm text-muted-foreground">
            A fatal error occurred. Please try again.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
