import {
  shareChannelSchema,
  type ShareChannel,
} from '@/lib/validation/engagement';

export const SHARE_CHANNELS = shareChannelSchema.options;

export function isShareChannel(value: unknown): value is ShareChannel {
  return shareChannelSchema.safeParse(value).success;
}

/**
 * Builds a share URL with the ?ref=<channel> query param appended.
 * Preserves existing search params and hashes, while overriding or adding 'ref'.
 */
export function buildShareUrl(urlOrPath: string, channel: ShareChannel): string {
  try {
    const isAbsolute =
      urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://');
    const base = isAbsolute ? undefined : 'https://genra.local';
    const parsed = new URL(urlOrPath, base);

    parsed.searchParams.set('ref', channel);

    if (isAbsolute) {
      return parsed.toString();
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    const separator = urlOrPath.includes('?') ? '&' : '?';
    return `${urlOrPath}${separator}ref=${channel}`;
  }
}

export interface ShareIntentParams {
  url: string;
  title: string;
  summary?: string;
}

/**
 * Generates external sharing intent URLs with pre-filled content and tracked ref links.
 * Returns null for channels handled directly in-browser (like copy_link and native).
 */
export function buildShareIntentUrl(
  channel: ShareChannel,
  params: ShareIntentParams
): string | null {
  const trackedUrl = buildShareUrl(params.url, channel);
  const encodedUrl = encodeURIComponent(trackedUrl);
  const titleText = params.title ? `${params.title} on Genra` : 'Genra — Built with AI';
  const encodedTitle = encodeURIComponent(titleText);

  switch (channel) {
    case 'x':
      return `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    case 'whatsapp': {
      const waText = encodeURIComponent(`${titleText}\n${trackedUrl}`);
      return `https://api.whatsapp.com/send?text=${waText}`;
    }
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case 'reddit':
      return `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;
    case 'email': {
      const body = params.summary
        ? `${params.summary}\n\n${trackedUrl}`
        : trackedUrl;
      return `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(body)}`;
    }
    case 'copy_link':
    case 'native':
      return null;
  }
}
