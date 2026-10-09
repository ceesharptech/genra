'use client';

import React from 'react';
import { LikeButton } from './like-button';
import { SaveButton } from './save-button';
import { ShareButton } from './share-button';
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
  title?: string;
  summary?: string;
  url?: string;
  showShare?: boolean;
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
  title = '',
  summary,
  url,
  showShare = true,
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
      {showShare && targetType === 'creation' && (
        <ShareButton
          creationId={targetId}
          title={title}
          summary={summary}
          url={url}
        />
      )}
    </div>
  );
}
