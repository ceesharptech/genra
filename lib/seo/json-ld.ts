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

/**
 * Builds schema.org CreativeWork structured data for a prompt.
 */
export function buildPromptJsonLd(prompt: {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  author: { username: string; display_name: string | null };
  model_tool?: { name: string } | null;
}) {
  const url = absoluteUrl(`/prompts/${prompt.id}`);
  const authorName = prompt.author.display_name || prompt.author.username;
  const authorUrl = absoluteUrl(`/u/${prompt.author.username}`);

  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': url,
    url,
    name: prompt.title,
    headline: prompt.title,
    text: prompt.body.slice(0, 500),
    datePublished: prompt.created_at,
    dateModified: prompt.updated_at,
    creator: {
      '@type': 'Person',
      name: authorName,
      url: authorUrl,
    },
    ...(prompt.model_tool?.name ? { keywords: prompt.model_tool.name } : {}),
  };
}

/**
 * Builds schema.org CreativeWork structured data for a resource.
 */
export function buildResourceJsonLd(resource: {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  author: { username: string; display_name: string | null };
  tool?: { name: string } | null;
}) {
  const url = absoluteUrl(`/resources/${resource.id}`);
  const authorName = resource.author.display_name || resource.author.username;
  const authorUrl = absoluteUrl(`/u/${resource.author.username}`);

  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': url,
    url,
    name: resource.title,
    headline: resource.title,
    description: resource.description || resource.title,
    datePublished: resource.created_at,
    dateModified: resource.updated_at,
    creator: {
      '@type': 'Person',
      name: authorName,
      url: authorUrl,
    },
    ...(resource.tool?.name ? { keywords: resource.tool.name } : {}),
  };
}

/**
 * Builds schema.org CollectionPage structured data for a curated collection.
 */
export function buildCollectionJsonLd(collection: {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  owner: { username: string; display_name: string | null };
  item_count: number;
}) {
  const url = absoluteUrl(`/collections/${collection.id}`);
  const authorName = collection.owner.display_name || collection.owner.username;
  const authorUrl = absoluteUrl(`/u/${collection.owner.username}`);

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': url,
    url,
    name: collection.title,
    headline: collection.title,
    description: collection.description || `Curated collection on Genra.`,
    datePublished: collection.created_at,
    dateModified: collection.updated_at,
    creator: {
      '@type': 'Person',
      name: authorName,
      url: authorUrl,
    },
    numberOfItems: collection.item_count,
  };
}

/**
 * Builds schema.org SoftwareApplication structured data for a tool.
 */
export function buildToolJsonLd(tool: {
  name: string;
  slug: string;
  vendor: string | null;
  website_url: string | null;
  logo_url: string | null;
  kind: string;
}) {
  const url = absoluteUrl(`/tools/${tool.slug}`);

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': url,
    url,
    name: tool.name,
    headline: tool.name,
    applicationCategory: tool.kind.replace('_', ' '),
    ...(tool.website_url ? { sameAs: tool.website_url } : {}),
    ...(tool.logo_url ? { image: tool.logo_url } : {}),
    ...(tool.vendor
      ? {
          author: {
            '@type': 'Organization',
            name: tool.vendor,
          },
        }
      : {}),
  };
}
