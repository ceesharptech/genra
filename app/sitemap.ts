import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';
import { createPublicClient } from '@/lib/supabase/public';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.VERCEL_ENV !== 'production') {
    return [];
  }

  const siteUrl = getSiteUrl();
  const supabase = createPublicClient();

  // Parallel fetch: categories, creations, creators, prompts, resources, tools, collections
  const [
    categoriesRes,
    creationsRes,
    creatorsRes,
    promptsRes,
    resourcesRes,
    toolsRes,
    collectionsRes,
  ] = await Promise.all([
    supabase.from('categories').select('slug').order('name'),
    supabase
      .from('creations')
      .select('slug, updated_at')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(50000),
    supabase
      .from('creations')
      .select('creator:profiles!creations_creator_id_fkey(username, updated_at)')
      .eq('status', 'published')
      .is('deleted_at', null),
    supabase
      .from('prompts')
      .select('id, updated_at')
      .eq('is_public', true)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(50000),
    supabase
      .from('resources')
      .select('id, updated_at')
      .eq('is_public', true)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(50000),
    supabase
      .from('tools')
      .select('slug, is_verified, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('collections')
      .select('id, updated_at')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(50000),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/discover`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/prompts`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/resources`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  const categoryPages: MetadataRoute.Sitemap = (
    categoriesRes.data || []
  ).map((cat) => ({
    url: `${siteUrl}/discover?category=${encodeURIComponent(cat.slug)}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const creationPages: MetadataRoute.Sitemap = (
    creationsRes.data || []
  ).map((c) => ({
    url: `${siteUrl}/c/${c.slug}`,
    lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const promptPages: MetadataRoute.Sitemap = (
    promptsRes.data || []
  ).map((p) => ({
    url: `${siteUrl}/prompts/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const resourcePages: MetadataRoute.Sitemap = (
    resourcesRes.data || []
  ).map((r) => ({
    url: `${siteUrl}/resources/${r.id}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const toolPages: MetadataRoute.Sitemap = (
    toolsRes.data || []
  )
    .filter((t) => t.is_verified)
    .map((t) => ({
      url: `${siteUrl}/tools/${t.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  const collectionPages: MetadataRoute.Sitemap = (
    collectionsRes.data || []
  ).map((col) => ({
    url: `${siteUrl}/collections/${col.id}`,
    lastModified: col.updated_at ? new Date(col.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  // Unique creator profile URLs
  const seenProfiles = new Set<string>();
  const profilePages: MetadataRoute.Sitemap = [];

  for (const item of creatorsRes.data || []) {
    const profile = item.creator as { username: string; updated_at?: string } | null;
    if (profile && profile.username && !seenProfiles.has(profile.username)) {
      seenProfiles.add(profile.username);
      profilePages.push({
        url: `${siteUrl}/u/${profile.username}`,
        lastModified: profile.updated_at ? new Date(profile.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  }

  return [
    ...staticPages,
    ...categoryPages,
    ...creationPages,
    ...promptPages,
    ...resourcePages,
    ...toolPages,
    ...collectionPages,
    ...profilePages,
  ];
}
