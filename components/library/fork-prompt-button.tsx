'use client';

import React, { useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { GitForkIcon, Loading03Icon } from '@hugeicons/core-free-icons';
import { forkPromptAction } from '@/lib/library/actions';
import { toast } from 'sonner';

interface ForkPromptButtonProps {
  promptId: string;
  isSignedIn: boolean;
  className?: string;
}

export function ForkPromptButton({
  promptId,
  isSignedIn,
  className,
}: ForkPromptButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleFork = () => {
    if (!isSignedIn) {
      const loginUrl = `/login?next=${encodeURIComponent(pathname || `/prompts/${promptId}`)}`;
      router.push(loginUrl);
      return;
    }

    startTransition(async () => {
      try {
        const res = await forkPromptAction({ promptId });
        if (!res.ok || !res.data) {
          toast.error(res.error || 'Failed to fork prompt');
          return;
        }

        toast.success('Prompt forked to your library!');
        router.push(`/prompts/${res.data.forkId}`);
      } catch (err) {
        console.error('Failed to fork prompt:', err);
        toast.error('An unexpected error occurred while forking');
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleFork}
      disabled={isPending}
      className={className}
    >
      {isPending ? (
        <HugeiconsIcon icon={Loading03Icon} className="size-3.5 animate-spin" />
      ) : (
        <HugeiconsIcon icon={GitForkIcon} className="size-3.5" />
      )}
      <span>{isPending ? 'Forking...' : 'Fork'}</span>
    </Button>
  );
}
