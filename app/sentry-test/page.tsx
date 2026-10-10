import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { validateSentryTestToken } from '@/lib/monitoring/token-gate';
import { checkRateLimit } from '@/lib/rate-limit';
import { ClientControls } from './client-controls';

export const metadata: Metadata = {
  title: 'Sentry Diagnostics | Genra',
  robots: {
    index: false,
    follow: false,
  },
};

interface SentryTestPageProps {
  searchParams: Promise<{
    token?: string;
  }>;
}

export default async function SentryTestPage({ searchParams }: SentryTestPageProps) {
  const { token } = await searchParams;

  // 1. Strict Token Gate: constant-time comparison against SENTRY_TEST_TOKEN
  if (!validateSentryTestToken(token)) {
    notFound();
  }

  // 2. Rate limit check (using Phase 07 rate limiter)
  const rateLimit = await checkRateLimit('report', 'sentry_test_page_view');
  if (!rateLimit.success) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-lg py-16 px-4">
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6 text-center">
        <div>
          <h1 className="font-bricolage text-2xl font-bold tracking-tight">
            Sentry Verification Console
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Token verified. Trigger diagnostics below to verify error ingestion, source maps, and release tags.
          </p>
        </div>

        <ClientControls token={token!} />
      </div>
    </div>
  );
}
