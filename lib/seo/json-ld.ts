/**
 * Safe JSON-LD Serialization and Structured Data Builders
 */
import { absoluteUrl } from '@/lib/site';
import type { CreationWithDetails } from '@/lib/data/creations';

/**
 * Safely serializes data to a JSON string for embedding inside a
 * <script type="application/ld+json"> tag.
 *
 * Strictly escapes '<', '>', '&', U+2028 and U+2029 to prevent XSS
 * and script tag breakout attacks (e.g. </script><script>alert(1)</script>).
 */
export function safeJsonLdReplacer(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Builds schema.org CreativeWork structured data for a creation.
 */
export function buildCreationJsonLd(
  creation: CreationWithDetails,
  description: string
) {
  const url = absoluteUrl(`/c/${creation.slug}`);
  const ogImageUrl = absoluteUrl(
    `/c/${creation.slug}/og?v=${new Date(creation.updated_at).getTime()}`
  );

  const keywords: string[] = [];
  if (creation.category?.name) {
    keywords.push(creation.category.name);
  }
  for (const t of creation.tools) {
    if (t.tool?.name && !keywords.includes(t.tool.name)) {
      keywords.push(t.tool.name);
    }
  }
  for (const tg of creation.tags) {
    if (tg.tag?.name && !keywords.includes(tg.tag.name)) {
      keywords.push(tg.tag.name);
    }
  }

  const creatorName =
    creation.creator?.display_name || creation.creator?.username || 'Creator';
  const creatorUrl = creation.creator?.username
    ? absoluteUrl(`/u/${creation.creator.username}`)
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': url,
    url,
    name: creation.title,
    headline: creation.title,
    description,
    image: ogImageUrl,
    datePublished: creation.published_at || creation.created_at,
    dateModified: creation.updated_at,
    creator: {
      '@type': 'Person',
      name: creatorName,
      ...(creatorUrl ? { url: creatorUrl } : {}),
    },
    ...(keywords.length > 0 ? { keywords: keywords.join(', ') } : {}),
  };
}

/**
 * Builds schema.org ProfilePage & Person structured data for a creator profile.
 */
export function buildProfileJsonLd(profile: {
  username: string;
  display_name: string | null;
  bio: string | null;
  headline: string | null;
}) {
  const url = absoluteUrl(`/u/${profile.username}`);
  const name = profile.display_name || profile.username;
  const description =
    profile.headline || profile.bio || `AI creator profile for @${profile.username} on Genra.`;

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name,
      alternateName: `@${profile.username}`,
      url,
      description,
    },
  };
}
