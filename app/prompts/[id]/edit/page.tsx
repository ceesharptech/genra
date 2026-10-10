import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser, getCurrentProfile } from '@/lib/auth/server';
import { getPrompt } from '@/lib/data/library';
import { searchTools } from '@/lib/data/creations';
import { PromptForm } from '@/components/library/prompt-form';
import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

export const metadata: Metadata = {
  title: 'Edit Prompt · Genra',
  robots: {
    index: false,
    follow: false,
  },
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditPromptPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/prompts/${id}/edit`);
  }

  const profile = await getCurrentProfile();
  if (!profile || !profile.onboarded_at) {
    redirect(`/onboarding?next=/prompts/${id}/edit`);
  }

  const [promptRes, tools] = await Promise.all([
    getPrompt(id, user.id),
    searchTools(),
  ]);

  const prompt = promptRes.data;
  if (!prompt || prompt.author.id !== user.id) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href={`/prompts/${prompt.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
            <span>Back to prompt</span>
          </Link>
        </div>

        <div className="mb-8 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Edit prompt
          </h1>
          <p className="text-sm text-muted-foreground">
            Update your prompt instructions, model assignment, or visibility.
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-2xs sm:p-8">
          <PromptForm
            initialData={{
              id: prompt.id,
              title: prompt.title,
              body: prompt.body,
              kind: prompt.kind,
              model_tool_id: prompt.model_tool_id,
              is_public: prompt.is_public,
              used_in_count: prompt.used_in_count,
            }}
            availableTools={tools}
          />
        </div>
      </main>
    </div>
  );
}
