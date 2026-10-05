'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { FavouriteIcon } from '@hugeicons/core-free-icons';
import { useEngagementQueue } from '@/hooks/use-engagement-queue';
import { setLikeAction } from '@/lib/engagement/actions';
import { formatIntent } from '@/lib/auth/intents';
import { cn } from '@/lib/utils';
import type { EngagementTargetType } from '@/lib/validation/engagement';

export interface LikeButtonProps {
  targetId: string;
  targetType?: EngagementTargetType;
  initialLiked?: boolean;
  initialCount?: number;
  isSignedIn: boolean;
  showCount?: boolean;
  className?: string;
}

export function LikeButton({
  targetId,
  targetType = 'creation',
  initialLiked = false,
  initialCount = 0,
  isSignedIn,
  showCount = true,
  className,
}: LikeButtonProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { state: liked, count, isPending, toggle } = useEngagementQueue({
    initialState: initialLiked,
    initialCount,
    onCommit: (nextLiked) => setLikeAction(targetType, targetId, nextLiked),
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      const intent = formatIntent('like', targetType, targetId);
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
      aria-pressed={liked}
      aria-label={liked ? `Liked, ${count} likes` : `Like, ${count} likes`}
      disabled={isPending && false}
      className={cn(
        'group relative inline-flex min-h-[44px] sm:min-h-[36px] items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ease-out select-none cursor-pointer',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
        liked
          ? 'border-brand-200/80 bg-brand-50/60 dark:border-brand-800/60 dark:bg-brand-950/30 text-foreground'
          : 'border-border/80 bg-surface-1 hover:border-border hover:bg-surface-2 text-muted-foreground hover:text-foreground',
        'active:scale-[0.97] motion-reduce:transform-none',
        className
      )}
    >
      <span
        className={cn(
          'inline-flex transition-transform duration-120 ease-out motion-reduce:transition-none',
          liked ? 'scale-110' : 'group-hover:scale-105'
        )}
      >
        <HugeiconsIcon
          icon={FavouriteIcon}
          className={cn(
            'size-4 transition-colors duration-150',
            liked
              ? 'text-brand fill-brand dark:text-brand-400 dark:fill-brand-400'
              : 'text-muted-foreground group-hover:text-foreground'
          )}
        />
      </span>

      <span className="font-medium">{liked ? 'Liked' : 'Like'}</span>

      {showCount && (
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
          <span className="sr-only" aria-live="polite">
            {count} {count === 1 ? 'like' : 'likes'}
          </span>
        </>
      )}
    </button>
  );
}
