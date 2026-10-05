'use client';

import React from 'react';
import { LikeButton } from './like-button';
import { SaveButton } from './save-button';
import { cn } from '@/lib/utils';
import type { EngagementTargetType } from '@/lib/validation/engagement';

export interface EngagementBarProps {
  targetId: string;
  targetType?: EngagementTargetType;
  initialLiked: boolean;
  initialSaved: boolean;
  likeCount: number;
  saveCount?: number;
  isSignedIn: boolean;
  className?: string;
}

export function EngagementBar({
  targetId,
  targetType = 'creation',
  initialLiked,
  initialSaved,
  likeCount,
  saveCount,
  isSignedIn,
  className,
}: EngagementBarProps) {
  return (
    <div
      className={cn('inline-flex items-center gap-2', className)}
      role="group"
      aria-label="Creation engagement actions"
    >
      <LikeButton
        targetId={targetId}
        targetType={targetType}
        initialLiked={initialLiked}
        initialCount={likeCount}
        isSignedIn={isSignedIn}
      />
      <SaveButton
        targetId={targetId}
        targetType={targetType}
        initialSaved={initialSaved}
        initialCount={saveCount}
        isSignedIn={isSignedIn}
      />
    </div>
  );
}
