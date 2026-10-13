'use client';

import * as React from 'react';
import posthog from 'posthog-js';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function subscribe(callback: () => void) {
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', callback);
    return () => window.removeEventListener('storage', callback);
  }
  return () => {};
}

function getSnapshot(): boolean {
  try {
    if (typeof window !== 'undefined') {
      return Boolean(posthog.has_opted_out_capturing());
    }
  } catch {
    // PostHog might not be initialized
  }
  return false;
}

function getServerSnapshot(): boolean {
  return false;
}

export function PostHogOptOut() {
  const isOptedOut = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  const handleToggle = () => {
    try {
      if (isOptedOut) {
        posthog.opt_in_capturing();
        toast.success('Analytics telemetry re-enabled. Thank you for helping us improve Genra.');
      } else {
        posthog.opt_out_capturing();
        toast.success('You have successfully opted out of all telemetry and analytics capturing.');
      }
      forceUpdate();
    } catch {
      toast.error('Unable to update telemetry preferences. Please check browser settings or adblocker.');
    }
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">
              Analytics Telemetry Preference
            </h4>
            <span
              className={cn(
                'rounded-md px-2 py-0.5 text-[11px] font-medium',
                isOptedOut
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              )}
            >
              {isOptedOut ? 'Opted Out' : 'Active (Anonymous)'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-lg">
            Genra uses cookieless, reverse-proxied telemetry with zero personal identifiers. You can opt out of all event capturing at any time.
          </p>
        </div>

        <Button
          type="button"
          variant={isOptedOut ? 'default' : 'outline'}
          size="sm"
          onClick={handleToggle}
          className="shrink-0 text-xs font-medium"
        >
          {isOptedOut ? 'Re-enable analytics' : 'Opt out of analytics'}
        </Button>
      </div>
    </div>
  );
}
