import { describe, it, expect } from 'vitest'
import {
  slugify,
  generateDraftSlug,
  generatePublishedSlug,
  normalizeTag,
  parseVideoEmbedUrl,
} from '@/lib/validation/creation-helpers'

describe('Creation Helpers', () => {
  describe('slugify', () => {
    it('converts titles to lowercase URL slugs', () => {
      expect(slugify('Minimalist Landing Page 2.0')).toBe('minimalist-landing-page-2-0')
      expect(slugify('  Hello World!  ')).toBe('hello-world')
      expect(slugify('Special @#$% Characters')).toBe('special-characters')
      expect(slugify('Café & Résumé')).toBe('cafe-resume')
    })
  })

  describe('generateDraftSlug', () => {
    it('creates a draft-prefixed slug with 10 hex characters', () => {
      const slug = generateDraftSlug()
      expect(slug).toMatch(/^draft-[0-9a-f]{10}$/)
    })

    it('generates distinct slugs on subsequent calls', () => {
      const s1 = generateDraftSlug()
      const s2 = generateDraftSlug()
      expect(s1).not.toBe(s2)
    })
  })

  describe('generatePublishedSlug', () => {
    it('creates a title slug with a 6 hex random suffix', () => {
      const slug = generatePublishedSlug('Modern NextJS App')
      expect(slug).toMatch(/^modern-nextjs-app-[0-9a-f]{6}$/)
    })

    it('handles empty titles by defaulting to creation-<hex>', () => {
      const slug = generatePublishedSlug('')
      expect(slug).toMatch(/^creation-[0-9a-f]{6}$/)
    })
  })

  describe('normalizeTag', () => {
    it('normalizes tag inputs to clean kebab case', () => {
      expect(normalizeTag(' Web Design ')).toBe('web-design')
      expect(normalizeTag('UI/UX Design')).toBe('uiux-design')
      expect(normalizeTag('#nextjs')).toBe('nextjs')
      expect(normalizeTag('AI---Tools')).toBe('ai-tools')
    })
  })

  describe('parseVideoEmbedUrl', () => {
    it('parses standard YouTube watch URLs', () => {
      const res = parseVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      expect(res).toEqual({
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      })
    })

    it('parses youtu.be short links', () => {
      const res = parseVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=10')
      expect(res).toEqual({
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      })
    })

    it('parses YouTube shorts', () => {
      const res = parseVideoEmbedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')
      expect(res).toEqual({
        provider: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      })
    })

    it('parses Vimeo URLs', () => {
      const res = parseVideoEmbedUrl('https://vimeo.com/76979871')
      expect(res).toEqual({
        provider: 'vimeo',
        videoId: '76979871',
        embedUrl: 'https://player.vimeo.com/video/76979871',
      })
    })

    it('parses Loom share URLs', () => {
      const res = parseVideoEmbedUrl('https://www.loom.com/share/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4')
      expect(res).toEqual({
        provider: 'loom',
        videoId: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
        embedUrl: 'https://www.loom.com/embed/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      })
    })

    it('returns null for unsupported domains or invalid URLs', () => {
      expect(parseVideoEmbedUrl('https://evil.com/video/123')).toBeNull()
      expect(parseVideoEmbedUrl('not-a-url')).toBeNull()
      expect(parseVideoEmbedUrl('')).toBeNull()
    })
  })
})
