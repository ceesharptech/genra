import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser, getCurrentProfile } from '@/lib/auth/server';
import { getResource } from '@/lib/data/library';
import { searchTools } from '@/lib/data/creations';
import { ResourceForm } from '@/components/library/resource-form';
import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

export const metadata: Metadata = {
  title: 'Edit Resource · Genra',
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

export default async function EditResourcePage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/resources/${id}/edit`);
  }

  const profile = await getCurrentProfile();
  if (!profile || !profile.onboarded_at) {
    redirect(`/onboarding?next=/resources/${id}/edit`);
  }

  const [resourceRes, tools] = await Promise.all([
    getResource(id, user.id),
    searchTools(),
  ]);

  const resource = resourceRes.data;
  if (!resource || resource.author.id !== user.id) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href={`/resources/${resource.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
            <span>Back to resource</span>
          </Link>
        </div>

        <div className="mb-8 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Edit resource
          </h1>
          <p className="text-sm text-muted-foreground">
            Update your resource details, links, guide, or visibility.
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-2xs sm:p-8">
          <ResourceForm
            initialData={{
              id: resource.id,
              title: resource.title,
              description: resource.description,
              kind: resource.kind,
              url: resource.url,
              body: resource.body,
              tool_id: resource.tool_id,
              is_public: resource.is_public,
              used_in_count: resource.used_in_count,
            }}
            availableTools={tools}
          />
        </div>
      </main>
    </div>
  );
}
