import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser, getCurrentProfile } from '@/lib/auth/server';
import { searchTools } from '@/lib/data/creations';
import { ResourceForm } from '@/components/library/resource-form';
import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

export const metadata: Metadata = {
  title: 'Share a Resource · Genra',
  description: 'Share a guide, template, dataset, or workflow with the Genra community.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewResourcePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?next=/resources/new');
  }

  const profile = await getCurrentProfile();
  if (!profile || !profile.onboarded_at) {
    redirect('/onboarding?next=/resources/new');
  }

  const tools = await searchTools();

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/resources"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
            <span>Back to resources</span>
          </Link>
        </div>

        <div className="mb-8 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Share a resource
          </h1>
          <p className="text-sm text-muted-foreground">
            Share a tutorial, template, dataset, workflow, or starter kit for AI builders.
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-2xs sm:p-8">
          <ResourceForm availableTools={tools} />
        </div>
      </main>
    </div>
  );
}
