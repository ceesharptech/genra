'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { copyPromptAction } from '@/lib/engagement/actions';
import { formatIntent } from '@/lib/auth/intents';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface CopyPromptButtonProps {
  promptId: string;
  promptBody: string;
  isSignedIn: boolean;
  className?: string;
}

export function CopyPromptButton({
  promptId,
  promptBody,
  isSignedIn,
  className,
}: CopyPromptButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLoggedAtRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSignedIn) {
      const intent = formatIntent('copy', 'prompt', promptId);
      const targetUrl = pathname || '/';
      const loginUrl = `/login?next=${encodeURIComponent(targetUrl)}&intent=${encodeURIComponent(intent)}`;
      router.push(loginUrl);
      return;
    }

    try {
      await navigator.clipboard.writeText(promptBody);
      setCopied(true);
      toast.success('Prompt copied to clipboard');

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);

      // Debounce analytics increment to at most once per 10 seconds per prompt
      const now = Date.now();
      if (now - lastLoggedAtRef.current > 10000) {
        lastLoggedAtRef.current = now;
        // Fire-and-forget server action
        copyPromptAction(promptId).catch((err) => {
          console.error('Failed to log prompt copy:', err);
        });
      }
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      toast.error('Could not copy prompt to clipboard');
    }
  };

  return (
    <button
      type="button"
      data-copy-button="true"
      onClick={handleCopy}
      aria-label={copied ? 'Prompt copied' : 'Copy prompt to clipboard'}
      className={cn(
        'group inline-flex min-h-[32px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150 select-none cursor-pointer',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none',
        copied
          ? 'bg-brand-50/80 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/40'
          : 'text-muted-foreground hover:text-foreground hover:bg-surface-2 border border-transparent hover:border-border/60',
        'active:scale-[0.98] motion-reduce:transform-none',
        className
      )}
    >
      <HugeiconsIcon
        icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
        className={cn(
          'size-3.5 transition-colors',
          copied ? 'text-brand dark:text-brand-400' : 'text-muted-foreground group-hover:text-foreground'
        )}
      />
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}
