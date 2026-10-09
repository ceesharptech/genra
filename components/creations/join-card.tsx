'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon,
  SparklesIcon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';

export function JoinCard() {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    // Persist dismissal in a 7-day cookie
    document.cookie = `genra_join_dismissed=1; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
  };

  if (dismissed) {
    return null;
  }

  return (
    <aside
      role="region"
      aria-label="Join Genra community"
      className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-surface-1 to-surface-2/60 p-6 sm:p-8 transition-all"
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss invitation"
        className="text-muted-foreground hover:text-foreground absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-full transition-colors hover:bg-surface-3 cursor-pointer"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/10 px-3 py-0.5 text-xs font-medium text-brand dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
            <HugeiconsIcon icon={SparklesIcon} className="size-3 text-brand" />
            <span>Join the AI creator platform</span>
          </div>

          <h3 className="font-bricolage text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            See how world-class AI work is really made
          </h3>

          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
            Inspect exact prompts, tools, and workflows. Save your favorite techniques,
            track creators, and publish your own AI projects.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link href="/signup">
            <Button className="h-10 rounded-full px-5 text-xs font-semibold gap-2 shadow-xs cursor-pointer">
              <span>Sign up free</span>
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
            </Button>
          </Link>

          <Link href="/login">
            <Button
              variant="outline"
              className="h-10 rounded-full px-4 text-xs font-medium cursor-pointer"
            >
              Log in
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
