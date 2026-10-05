'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { Bookmark02Icon } from '@hugeicons/core-free-icons';
import { useEngagementQueue } from '@/hooks/use-engagement-queue';
import { setSaveAction } from '@/lib/engagement/actions';
import { formatIntent } from '@/lib/auth/intents';
import { cn } from '@/lib/utils';
import type { EngagementTargetType } from '@/lib/validation/engagement';

export interface SaveButtonProps {
  targetId: string;
  targetType?: EngagementTargetType;
  initialSaved?: boolean;
  initialCount?: number;
  isSignedIn: boolean;
  showCount?: boolean;
  className?: string;
}

export function SaveButton({
  targetId,
  targetType = 'creation',
  initialSaved = false,
  initialCount = 0,
  isSignedIn,
  showCount = false,
  className,
}: SaveButtonProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { state: saved, count, isPending, toggle } = useEngagementQueue({
    initialState: initialSaved,
    initialCount,
    onCommit: (nextSaved) => setSaveAction(targetType, targetId, nextSaved),
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      const intent = formatIntent('save', targetType, targetId);
      const targetUrl = pathname || '/';
      const loginUrl = `/login?next=${encodeURIComponent(targetUrl)}&intent=${encodeURIComponent(intent)}`;
      router.push(loginUrl);
      return;
    }
    toggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? 'Saved to library' : 'Save to library'}
      disabled={isPending && false}
      className={cn(
        'group relative inline-flex min-h-[44px] sm:min-h-[36px] items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ease-out select-none cursor-pointer',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
        saved
          ? 'border-brand-200/80 bg-brand-50/60 dark:border-brand-800/60 dark:bg-brand-950/30 text-foreground'
          : 'border-border/80 bg-surface-1 hover:border-border hover:bg-surface-2 text-muted-foreground hover:text-foreground',
        'active:scale-[0.97] motion-reduce:transform-none',
        className
      )}
    >
      <span
        className={cn(
          'inline-flex transition-transform duration-120 ease-out motion-reduce:transition-none',
          saved ? 'scale-110' : 'group-hover:scale-105'
        )}
      >
        <HugeiconsIcon
          icon={Bookmark02Icon}
          className={cn(
            'size-4 transition-colors duration-150',
            saved
              ? 'text-brand fill-brand dark:text-brand-400 dark:fill-brand-400'
              : 'text-muted-foreground group-hover:text-foreground'
          )}
        />
      </span>

      <span className="font-medium">{saved ? 'Saved' : 'Save'}</span>

      {showCount && count > 0 && (
        <>
          <span
            className="text-border-strong select-none dark:text-border"
            aria-hidden="true"
          >
            ·
          </span>
          <span className="tabular-nums font-semibold text-foreground/90">
            {count}
          </span>
        </>
      )}

      <span className="sr-only" aria-live="polite">
        {saved ? 'Creation saved to library' : 'Creation removed from library'}
      </span>
    </button>
  );
}
