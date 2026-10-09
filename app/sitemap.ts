import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';
import { createPublicClient } from '@/lib/supabase/public';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const supabase = createPublicClient();

  // Parallel fetch: categories, published creations, and creators
  const [categoriesRes, creationsRes, creatorsRes] = await Promise.all([
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
      .select(
        'creator:profiles!creations_creator_id_fkey(username, updated_at)'
      )
      .eq('status', 'published')
      .is('deleted_at', null),
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

  // Unique creator profile URLs
  const seenProfiles = new Set<string>();
  const profilePages: MetadataRoute.Sitemap = [];

  for (const item of creatorsRes.data || []) {
    // PostgREST join can return object or null
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

  return [...staticPages, ...categoryPages, ...creationPages, ...profilePages];
}
