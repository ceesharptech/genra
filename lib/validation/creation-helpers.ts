/**
 * Helpers for creation authoring: slugification, safe video embeds,
 * tag normalization, and payload preparation.
 */

export interface ParsedVideoEmbed {
  provider: 'youtube' | 'vimeo' | 'loom'
  videoId: string
  embedUrl: string
}

/**
 * Normalizes text to a URL-friendly slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove accent marks
    .replace(/[^a-z0-9]+/g, '-')     // replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')         // trim leading/trailing hyphens
    .replace(/-{2,}/g, '-')          // collapse consecutive hyphens
}

/**
 * Generates a temporary draft slug: draft-<10 hex chars>
 */
export function generateDraftSlug(): string {
  const chars = '0123456789abcdef'
  let suffix = ''
  for (let i = 0; i < 10; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `draft-${suffix}`
}

/**
 * Generates a candidate permanent slug on publish:
 * <slugified-title>-<6 hex chars>
 */
export function generatePublishedSlug(title: string): string {
  const base = slugify(title).slice(0, 60) || 'creation'
  const chars = '0123456789abcdef'
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `${base}-${suffix}`
}

/**
 * Normalizes a tag string: trimmed, lowercased, single spaces,
 * no invalid special characters.
 */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Parses user-provided video URL for YouTube, Vimeo, or Loom,
 * and derives a safe embed URL using only the validated ID.
 * Rejects arbitrary or malicious URLs.
 */
export function parseVideoEmbedUrl(url: string): ParsedVideoEmbed | null {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()

  // 1. YouTube
  // Matches:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://m.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/shorts/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  )
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1]
    return {
      provider: 'youtube',
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    }
  }

  // 2. Vimeo
  // Matches:
  // - https://vimeo.com/VIDEO_ID
  // - https://player.vimeo.com/video/VIDEO_ID
  const vimeoMatch = trimmed.match(
    /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]{5,12})/
  )
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1]
    return {
      provider: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
    }
  }

  // 3. Loom
  // Matches:
  // - https://www.loom.com/share/VIDEO_ID
  // - https://www.loom.com/embed/VIDEO_ID
  const loomMatch = trimmed.match(
    /loom\.com\/(?:share|embed)\/([a-zA-Z0-9]{32})/
  )
  if (loomMatch && loomMatch[1]) {
    const videoId = loomMatch[1]
    return {
      provider: 'loom',
      videoId,
      embedUrl: `https://www.loom.com/embed/${videoId}`,
    }
  }

  return null
}
