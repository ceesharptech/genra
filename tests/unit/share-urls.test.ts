import { describe, it, expect } from 'vitest';
import {
  SHARE_CHANNELS,
  isShareChannel,
  buildShareUrl,
  buildShareIntentUrl,
} from '@/lib/share/urls';

describe('Share URLs and Intent Builder', () => {
  describe('channel validation', () => {
    it('recognizes all 8 valid share channels', () => {
      const expected = [
        'copy_link',
        'native',
        'x',
        'linkedin',
        'whatsapp',
        'facebook',
        'reddit',
        'email',
      ];
      expect(SHARE_CHANNELS).toEqual(expected);
      for (const ch of expected) {
        expect(isShareChannel(ch)).toBe(true);
      }
    });

    it('rejects invalid channels', () => {
      expect(isShareChannel('tiktok')).toBe(false);
      expect(isShareChannel('')).toBe(false);
      expect(isShareChannel(null)).toBe(false);
      expect(isShareChannel(undefined)).toBe(false);
      expect(isShareChannel('twitter')).toBe(false);
    });
  });

  describe('buildShareUrl', () => {
    it('appends ref parameter to clean absolute URLs', () => {
      const url = 'https://genra.art/c/gemini-canvas';
      const shared = buildShareUrl(url, 'x');
      expect(shared).toBe('https://genra.art/c/gemini-canvas?ref=x');
    });

    it('replaces existing ref parameter', () => {
      const url = 'https://genra.art/c/gemini-canvas?ref=copy_link';
      const shared = buildShareUrl(url, 'linkedin');
      expect(shared).toBe('https://genra.art/c/gemini-canvas?ref=linkedin');
    });

    it('preserves existing query parameters and hash', () => {
      const url = 'https://genra.art/c/gemini-canvas?foo=bar#section';
      const shared = buildShareUrl(url, 'whatsapp');
      expect(shared).toContain('foo=bar');
      expect(shared).toContain('ref=whatsapp');
      expect(shared).toContain('#section');
    });

    it('handles relative paths', () => {
      const path = '/c/gemini-canvas';
      const shared = buildShareUrl(path, 'reddit');
      expect(shared).toBe('/c/gemini-canvas?ref=reddit');
    });
  });

  describe('buildShareIntentUrl', () => {
    const params = {
      url: 'https://genra.art/c/brand-generator',
      title: 'Brand Generator AI',
      summary: 'Generate consistent brand identities with Flux and Claude.',
    };

    it('returns null for in-app channels copy_link and native', () => {
      expect(buildShareIntentUrl('copy_link', params)).toBeNull();
      expect(buildShareIntentUrl('native', params)).toBeNull();
    });

    it('generates an X tweet intent with encoded text and ref=x url', () => {
      const xUrl = buildShareIntentUrl('x', params);
      expect(xUrl).toBeDefined();
      expect(xUrl).toContain('https://x.com/intent/tweet?');
      expect(xUrl).toContain('ref%3Dx');
      expect(xUrl).toContain('Brand%20Generator%20AI%20on%20Genra');
    });

    it('generates a LinkedIn share intent with ref=linkedin url', () => {
      const liUrl = buildShareIntentUrl('linkedin', params);
      expect(liUrl).toBeDefined();
      expect(liUrl).toContain('https://www.linkedin.com/sharing/share-offsite/?url=');
      expect(liUrl).toContain('ref%3Dlinkedin');
    });

    it('generates a WhatsApp intent with encoded text and ref=whatsapp url', () => {
      const waUrl = buildShareIntentUrl('whatsapp', params);
      expect(waUrl).toBeDefined();
      expect(waUrl).toContain('https://api.whatsapp.com/send?text=');
      expect(waUrl).toContain('ref%3Dwhatsapp');
    });

    it('generates a Facebook intent with ref=facebook url', () => {
      const fbUrl = buildShareIntentUrl('facebook', params);
      expect(fbUrl).toBeDefined();
      expect(fbUrl).toContain('https://www.facebook.com/sharer/sharer.php?u=');
      expect(fbUrl).toContain('ref%3Dfacebook');
    });

    it('generates a Reddit intent with ref=reddit url', () => {
      const rdUrl = buildShareIntentUrl('reddit', params);
      expect(rdUrl).toBeDefined();
      expect(rdUrl).toContain('https://www.reddit.com/submit?url=');
      expect(rdUrl).toContain('ref%3Dreddit');
    });

    it('generates a mailto link with encoded subject and body', () => {
      const mailUrl = buildShareIntentUrl('email', params);
      expect(mailUrl).toBeDefined();
      expect(mailUrl?.startsWith('mailto:?subject=')).toBe(true);
      expect(mailUrl).toContain('ref%3Demail');
      expect(mailUrl).toContain('Flux%20and%20Claude');
    });
  });
});
