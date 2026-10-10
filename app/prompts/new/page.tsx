import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser, getCurrentProfile } from '@/lib/auth/server';
import { searchTools } from '@/lib/data/creations';
import { PromptForm } from '@/components/library/prompt-form';
import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

export const metadata: Metadata = {
  title: 'Share a Prompt · Genra',
  description: 'Share a reusable AI prompt with the Genra community.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewPromptPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?next=/prompts/new');
  }

  const profile = await getCurrentProfile();
  if (!profile || !profile.onboarded_at) {
    redirect('/onboarding?next=/prompts/new');
  }

  const tools = await searchTools();

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/prompts"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
            <span>Back to prompts</span>
          </Link>
        </div>

        <div className="mb-8 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Share a prompt
          </h1>
          <p className="text-sm text-muted-foreground">
            Publish a tested prompt for models, workflows, or system instructions.
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-2xs sm:p-8">
          <PromptForm availableTools={tools} />
        </div>
      </main>
    </div>
  );
}
