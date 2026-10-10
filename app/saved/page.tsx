import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/server';
import { savedCards } from '@/lib/data/engagement';
import { savedPrompts, savedResources } from '@/lib/data/library';
import { SavedView } from '@/components/saved/saved-view';
import { PromptGrid } from '@/components/library/prompt-grid';
import { ResourceGrid } from '@/components/library/resource-grid';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Layers01Icon,
  DocumentCodeIcon,
  AiSettingIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Saved library — Genra',
  description: 'Creations, prompts, and resources you have saved on Genra.',
  robots: {
    index: false,
    follow: false,
  },
};

interface PageProps {
  searchParams: Promise<{
    tab?: string;
  }>;
}

export default async function SavedPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?next=/saved');
  }

  const { tab = 'creations' } = await searchParams;
  const activeTab = tab === 'prompts' ? 'prompts' : tab === 'resources' ? 'resources' : 'creations';

  const [creationsRes, promptsRes, resourcesRes] = await Promise.all([
    activeTab === 'creations'
      ? savedCards({ limit: 24 })
      : Promise.resolve({ data: [], hasMore: false, error: null }),
    activeTab === 'prompts'
      ? savedPrompts(24, 0)
      : Promise.resolve({ data: [], error: null }),
    activeTab === 'resources'
      ? savedResources(24, 0)
      : Promise.resolve({ data: [], error: null }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Header section */}
      <div className="mb-6 space-y-1">
        <h1 className="font-bricolage text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
          Saved library
        </h1>
        <p className="text-muted-foreground text-sm">
          Creations, prompts, and resources you have bookmarked to revisit or build with.
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="mb-8 border-b border-border/60">
        <nav className="flex space-x-6" aria-label="Saved Tabs">
          <Link
            href="/saved"
            className={cn(
              'inline-flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors',
              activeTab === 'creations'
                ? 'border-brand text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            )}
          >
            <HugeiconsIcon icon={Layers01Icon} className="size-4" />
            <span>Creations</span>
          </Link>

          <Link
            href="/saved?tab=prompts"
            className={cn(
              'inline-flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors',
              activeTab === 'prompts'
                ? 'border-brand text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            )}
          >
            <HugeiconsIcon icon={DocumentCodeIcon} className="size-4" />
            <span>Prompts</span>
          </Link>

          <Link
            href="/saved?tab=resources"
            className={cn(
              'inline-flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors',
              activeTab === 'resources'
                ? 'border-brand text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            )}
          >
            <HugeiconsIcon icon={AiSettingIcon} className="size-4" />
            <span>Resources</span>
          </Link>
        </nav>
      </div>

      {/* Tab contents */}
      {activeTab === 'creations' && (
        <SavedView
          initialCreations={creationsRes.data}
          initialHasMore={creationsRes.hasMore}
          error={creationsRes.error}
        />
      )}

      {activeTab === 'prompts' && (
        <PromptGrid
          initialPrompts={promptsRes.data}
          emptyTitle="No saved prompts yet"
          emptyMessage="When you save prompts across Genra, they will appear here for easy reference."
        />
      )}

      {activeTab === 'resources' && (
        <ResourceGrid
          initialResources={resourcesRes.data}
          emptyTitle="No saved resources yet"
          emptyMessage="When you save guides, templates, or resources, they will be organized here."
        />
      )}
    </div>
  );
}
