import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/server';
import { discoverCards } from '@/lib/data/creations';
import { getProfileByUsername } from '@/lib/data/profile';
import { discoverPrompts, discoverResources } from '@/lib/data/library';
import { listUserCollections } from '@/lib/data/collections';
import { getSiteUrl } from '@/lib/site';
import { buildProfileJsonLd, safeJsonLdReplacer } from '@/lib/seo/json-ld';
import { CreationGrid } from '@/components/creations/creation-grid';
import { LoadMore } from '@/components/creations/load-more';
import { PromptGrid } from '@/components/library/prompt-grid';
import { ResourceGrid } from '@/components/library/resource-grid';
import { CollectionCard } from '@/components/collections/collection-card';
import { buttonVariants, Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ReportButton } from '@/components/moderation/report-button';
import { cn } from '@/lib/utils';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Globe02Icon,
  Settings01Icon,
  Link01Icon,
  PlusSignIcon,
  DashboardSquare01Icon,
  Layers01Icon,
  DocumentCodeIcon,
  Folder01Icon,
  Add01Icon,
} from '@hugeicons/core-free-icons';
import type { Metadata } from 'next';

interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const resolvedSearchParams = await searchParams;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    return {
      title: 'User Not Found · Genra',
      robots: { index: false, follow: false },
    };
  }

  const tab = resolvedSearchParams.tab;
  const displayName = profile.display_name || profile.username;
  const title = `${displayName} (@${profile.username})`;
  const description =
    profile.headline ||
    profile.bio ||
    `Explore AI creations, prompts, and tools by ${displayName} on Genra.`;
  const siteUrl = getSiteUrl();
  const canonicalUrl = tab ? `${siteUrl}/u/${profile.username}?tab=${encodeURIComponent(tab)}` : `${siteUrl}/u/${profile.username}`;
  const ogImageUrl = `${siteUrl}/u/${profile.username}/og`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${title} · Genra`,
      description,
      url: canonicalUrl,
      siteName: 'Genra',
      type: 'profile',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${displayName}'s profile on Genra`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { username } = await params;
  const { tab = 'creations' } = await searchParams;

  const [profile, currentUser] = await Promise.all([
    getProfileByUsername(username),
    getCurrentUser(),
  ]);

  if (!profile) {
    notFound();
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const activeTab = tab === 'library' ? 'library' : tab === 'collections' ? 'collections' : 'creations';

  // Parallel fetch content based on active tab
  const [cardsRes, promptsRes, resourcesRes, collectionsRes] = await Promise.all([
    activeTab === 'creations'
      ? discoverCards({
          creator_username: username,
          sort: 'new',
          limit: 24,
        })
      : Promise.resolve({ data: [], hasMore: false }),
    activeTab === 'library'
      ? discoverPrompts({
          authorUsername: username,
          limit: 24,
        })
      : Promise.resolve({ data: [] }),
    activeTab === 'library'
      ? discoverResources({
          authorUsername: username,
          limit: 24,
        })
      : Promise.resolve({ data: [] }),
    activeTab === 'collections'
      ? listUserCollections(profile.id, isOwnProfile)
      : Promise.resolve({ data: [] }),
  ]);

  const jsonLd = buildProfileJsonLd(profile);

  const displayName = profile.display_name || profile.username;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 1)
    .toUpperCase();

  const socialLinks = (profile.social_links as Record<string, string>) || {};
  const activeSocials = Object.entries(socialLinks).filter(([, url]) =>
    Boolean(url && url.startsWith('https://'))
  );

  const creations = cardsRes.data || [];
  const hasMore = cardsRes.hasMore;
  const prompts = promptsRes.data || [];
  const resources = resourcesRes.data || [];
  const collections = collectionsRes.data || [];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Structured Data (Schema.org JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd, safeJsonLdReplacer),
        }}
      />

      {/* Profile Header */}
      <div className="flex max-w-7xl flex-col gap-5 sm:gap-6">
        <Avatar className="border-border size-24 shrink-0 border sm:size-22 md:size-28">
          {profile.avatar_url && (
            <AvatarImage src={profile.avatar_url} alt={displayName} />
          )}
          <AvatarFallback className="bg-surface-2 text-foreground text-3xl font-semibold sm:text-4xl">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col flex-wrap items-baseline gap-0">
              <h1 className="font-bricolage text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
                {displayName}
              </h1>
              <span className="text-muted-foreground font-sans text-xs sm:text-sm">
                @{profile.username}
              </span>
            </div>

            {isOwnProfile ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/creations"
                  className={cn(
                    buttonVariants({ variant: 'secondary', size: 'sm' }),
                    'h-8 gap-1.5 rounded-full text-xs font-medium'
                  )}
                >
                  <HugeiconsIcon
                    icon={DashboardSquare01Icon}
                    className="size-3.5"
                  />
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'h-8 gap-1.5 rounded-full text-xs font-medium'
                  )}
                >
                  <HugeiconsIcon icon={Settings01Icon} className="size-3.5" />
                  Edit profile
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ReportButton
                  targetType="profile"
                  targetId={profile.id}
                  targetTitle={`@${profile.username}`}
                  isSignedIn={Boolean(currentUser)}
                  variant="outline"
                  size="sm"
                  showLabel
                />
              </div>
            )}
          </div>

          {(profile.headline || profile.bio) && (
            <div className="flex flex-col gap-1 pt-1">
              {profile.headline && (
                <p className="text-foreground/90 text-sm font-medium">
                  {profile.headline}
                </p>
              )}
              {profile.bio && (
                <p className="text-muted-foreground max-w-2xl text-sm/relaxed whitespace-pre-wrap">
                  {profile.bio}
                </p>
              )}
            </div>
          )}

          {/* Links */}
          {(profile.website_url || activeSocials.length > 0) && (
            <div className="text-muted-foreground flex flex-wrap items-center gap-3 pt-2 text-xs">
              {profile.website_url && (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <HugeiconsIcon icon={Globe02Icon} className="size-3.5" />
                  <span>{new URL(profile.website_url).hostname}</span>
                </a>
              )}

              {activeSocials.map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="hover:text-foreground flex items-center gap-1 capitalize transition-colors"
                >
                  <HugeiconsIcon icon={Link01Icon} className="size-3.5" />
                  <span>{platform === 'x' ? 'X' : platform}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mt-8 mb-8 border-b border-border/60">
        <nav className="flex space-x-6" aria-label="Profile Tabs">
          <Link
            href={`/u/${username}`}
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
            href={`/u/${username}?tab=library`}
            className={cn(
              'inline-flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors',
              activeTab === 'library'
                ? 'border-brand text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            )}
          >
            <HugeiconsIcon icon={DocumentCodeIcon} className="size-4" />
            <span>Library</span>
          </Link>

          <Link
            href={`/u/${username}?tab=collections`}
            className={cn(
              'inline-flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors',
              activeTab === 'collections'
                ? 'border-brand text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            )}
          >
            <HugeiconsIcon icon={Folder01Icon} className="size-4" />
            <span>Collections</span>
          </Link>
        </nav>
      </div>

      {/* Tab: Creations */}
      {activeTab === 'creations' && (
        <section className="space-y-6" aria-labelledby="profile-creations-heading">
          {creations.length === 0 ? (
            <div className="border-border flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-16 text-center">
              <h3 className="text-foreground text-base font-medium">No creations yet</h3>
              <p className="text-muted-foreground mt-1.5 max-w-sm text-sm">
                {isOwnProfile
                  ? "You haven't published any creations yet. Share your first AI-built project with the community."
                  : `${displayName} has not published any creations yet.`}
              </p>
              {isOwnProfile && (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link href="/new">
                    <Button variant="default" size="sm" className="gap-1.5 rounded-full">
                      <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
                      Create something new
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              <CreationGrid creations={creations} priorityCount={4} />
              <LoadMore
                initialHasMore={hasMore}
                initialOffset={creations.length}
                params={{ creator_username: username, sort: 'new' }}
                limit={24}
              />
            </>
          )}
        </section>
      )}

      {/* Tab: Library (Prompts and Resources) */}
      {activeTab === 'library' && (
        <div className="space-y-12">
          {/* Prompts section */}
          <section className="space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Authored Prompts ({prompts.length})
              </h2>
              {isOwnProfile && (
                <Link
                  href="/prompts/new"
                  className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1 h-7 text-xs' })}
                >
                  <HugeiconsIcon icon={Add01Icon} className="size-3" />
                  <span>Share prompt</span>
                </Link>
              )}
            </div>
            <PromptGrid
              initialPrompts={prompts}
              queryParams={{ authorUsername: username }}
              emptyTitle="No prompts authored yet"
              emptyMessage={
                isOwnProfile
                  ? 'Share your first prompt to help others discover and run it.'
                  : `${displayName} has not shared any public prompts yet.`
              }
            />
          </section>

          {/* Resources section */}
          <section className="space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Authored Resources & Guides ({resources.length})
              </h2>
              {isOwnProfile && (
                <Link
                  href="/resources/new"
                  className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1 h-7 text-xs' })}
                >
                  <HugeiconsIcon icon={Add01Icon} className="size-3" />
                  <span>Share resource</span>
                </Link>
              )}
            </div>
            <ResourceGrid
              initialResources={resources}
              queryParams={{ authorUsername: username }}
              emptyTitle="No resources shared yet"
              emptyMessage={
                isOwnProfile
                  ? 'Share guides, datasets, starter kits, or templates with the community.'
                  : `${displayName} has not shared any public resources yet.`
              }
            />
          </section>
        </div>
      )}

      {/* Tab: Collections */}
      {activeTab === 'collections' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Collections ({collections.length})
            </h2>
          </div>

          {collections.length === 0 ? (
            <div className="border-border flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-16 text-center">
              <div className="rounded-full bg-surface-2 p-3 text-muted-foreground">
                <HugeiconsIcon icon={Folder01Icon} className="size-6 text-muted-foreground" />
              </div>
              <h3 className="text-foreground text-base font-medium mt-4">No collections yet</h3>
              <p className="text-muted-foreground mt-1.5 max-w-sm text-sm">
                {isOwnProfile
                  ? 'Create collections to organize your favorite creations, prompts, and resources into shareable lists.'
                  : `${displayName} has not curated any public collections yet.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((c) => (
                <CollectionCard key={c.id} collection={c} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
