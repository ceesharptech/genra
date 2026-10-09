'use client';

import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Share01Icon,
  Copy01Icon,
  Tick02Icon,
  NewTwitterIcon,
  Linkedin01Icon,
  WhatsappIcon,
  Facebook01Icon,
  RedditIcon,
  Mail01Icon,
} from '@hugeicons/core-free-icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { buildShareUrl, buildShareIntentUrl } from '@/lib/share/urls';
import { recordShareAction } from '@/lib/share/actions';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import type { ShareChannel } from '@/lib/validation/engagement';

export interface ShareButtonProps {
  creationId: string;
  title: string;
  summary?: string;
  url?: string;
  className?: string;
}

export function ShareButton({
  creationId,
  title,
  summary,
  url,
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const canNativeShare = React.useSyncExternalStore(
    () => () => {},
    () =>
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function',
    () => false
  );

  const isTouchDevice = React.useSyncExternalStore(
    () => () => {},
    () =>
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0),
    () => false
  );

  const getTargetUrl = () => {
    if (url) return url;
    if (typeof window !== 'undefined') return window.location.href;
    return '';
  };

  const handleChannelShare = async (channel: ShareChannel) => {
    track('share_click', { channel, creationId });
    const targetUrl = getTargetUrl();

    if (channel === 'copy_link') {
      const shareUrl = buildShareUrl(targetUrl, 'copy_link');
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success('Link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy to clipboard', err);
        toast.error('Failed to copy link');
      }
      await recordShareAction(creationId, 'copy_link');
      return;
    }

    const intentUrl = buildShareIntentUrl(channel, {
      url: targetUrl,
      title,
      summary,
    });

    if (!intentUrl) return;

    if (channel === 'email') {
      window.location.href = intentUrl;
    } else {
      window.open(intentUrl, '_blank', 'noopener,noreferrer,width=640,height=560');
    }

    await recordShareAction(creationId, channel);
  };

  const handleNativeShare = async () => {
    if (!canNativeShare) return;
    const shareUrl = buildShareUrl(getTargetUrl(), 'native');

    try {
      await navigator.share({
        title,
        text: summary || `${title} on Genra`,
        url: shareUrl,
      });
      track('share_click', { channel: 'native', creationId });
      await recordShareAction(creationId, 'native');
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        toast.error('Could not open share sheet');
      }
    }
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (isTouchDevice && canNativeShare) {
      e.preventDefault();
      handleNativeShare();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={handleTriggerClick}
        aria-label="Share creation"
        className={cn(
          'group relative inline-flex min-h-[44px] sm:min-h-[36px] items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ease-out select-none cursor-pointer',
          'border-border/80 bg-surface-1 hover:border-border hover:bg-surface-2 text-muted-foreground hover:text-foreground',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
          'active:scale-[0.97] motion-reduce:transform-none',
          className
        )}
      >
        <HugeiconsIcon
          icon={copied ? Tick02Icon : Share01Icon}
          className={cn(
            'size-4 transition-colors duration-150',
            copied
              ? 'text-emerald-500'
              : 'text-muted-foreground group-hover:text-foreground'
          )}
        />
        <span>{copied ? 'Copied' : 'Share'}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Share Creation</DropdownMenuLabel>

          <DropdownMenuItem
            onClick={() => handleChannelShare('copy_link')}
            className="gap-2.5 cursor-pointer"
          >
            <HugeiconsIcon
              icon={copied ? Tick02Icon : Copy01Icon}
              className={cn('size-4', copied ? 'text-emerald-500' : 'text-muted-foreground')}
            />
            <span className="font-medium">{copied ? 'Link Copied!' : 'Copy link'}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => handleChannelShare('x')}
            className="gap-2.5 cursor-pointer"
          >
            <HugeiconsIcon icon={NewTwitterIcon} className="size-4 text-muted-foreground" />
            <span>Post to X</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleChannelShare('linkedin')}
            className="gap-2.5 cursor-pointer"
          >
            <HugeiconsIcon icon={Linkedin01Icon} className="size-4 text-muted-foreground" />
            <span>Share to LinkedIn</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleChannelShare('whatsapp')}
            className="gap-2.5 cursor-pointer"
          >
            <HugeiconsIcon icon={WhatsappIcon} className="size-4 text-muted-foreground" />
            <span>Send via WhatsApp</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleChannelShare('reddit')}
            className="gap-2.5 cursor-pointer"
          >
            <HugeiconsIcon icon={RedditIcon} className="size-4 text-muted-foreground" />
            <span>Post to Reddit</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleChannelShare('facebook')}
            className="gap-2.5 cursor-pointer"
          >
            <HugeiconsIcon icon={Facebook01Icon} className="size-4 text-muted-foreground" />
            <span>Share to Facebook</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleChannelShare('email')}
            className="gap-2.5 cursor-pointer"
          >
            <HugeiconsIcon icon={Mail01Icon} className="size-4 text-muted-foreground" />
            <span>Send via Email</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        {canNativeShare && !isTouchDevice && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={handleNativeShare}
                className="gap-2.5 cursor-pointer"
              >
                <HugeiconsIcon icon={Share01Icon} className="size-4 text-muted-foreground" />
                <span>More options…</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

