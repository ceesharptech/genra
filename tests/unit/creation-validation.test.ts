import { describe, it, expect } from 'vitest'
import {
  creationFormSchema,
  publishCreationSchema,
  quickCreatePromptSchema,
  quickCreateResourceSchema,
  proposeToolSchema,
} from '@/lib/validation/creation'

describe('Creation Validation Schemas', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000'
  const coverMediaId = '223e4567-e89b-12d3-a456-426614174001'

  describe('creationFormSchema (Draft)', () => {
    it('allows valid minimal draft payload', () => {
      const res = creationFormSchema.safeParse({
        id: validUuid,
        title: '',
        tools: [],
        media: [],
        steps: [],
        tags: [],
        prompts: [],
        resources: [],
      })
      expect(res.success).toBe(true)
    })

    it('enforces collection limits', () => {
      // Max 10 tools
      const elevenTools = Array.from({ length: 11 }, (_, i) => ({
        tool_id: i + 1,
        role: 'supporting' as const,
        position: i,
      }))
      const resTools = creationFormSchema.safeParse({
        id: validUuid,
        tools: elevenTools,
      })
      expect(resTools.success).toBe(false)

      // Max 12 media
      const thirteenMedia = Array.from({ length: 13 }, (_, i) => ({
        id: validUuid,
        kind: 'image' as const,
        role: 'gallery' as const,
        position: i,
      }))
      const resMedia = creationFormSchema.safeParse({
        id: validUuid,
        media: thirteenMedia,
      })
      expect(resMedia.success).toBe(false)
    })
  })

  describe('publishCreationSchema (Strict)', () => {
    it('accepts valid publish payload with required fields', () => {
      const res = publishCreationSchema.safeParse({
        id: validUuid,
        title: 'Minimalist Portfolio in Next.js',
        category_id: 1,
        cover_media_id: coverMediaId,
        media: [
          {
            id: coverMediaId,
            kind: 'image',
            role: 'thumbnail',
            storage_path: 'user/123/cover.webp',
            position: 0,
          },
        ],
        tools: [
          {
            tool_id: 1,
            role: 'primary',
            position: 0,
          },
        ],
        steps: [],
        tags: [],
        prompts: [],
        resources: [],
      })
      expect(res.success).toBe(true)
    })

    it('rejects empty title or default untitled title', () => {
      const resEmpty = publishCreationSchema.safeParse({
        id: validUuid,
        title: '   ',
        category_id: 1,
        cover_media_id: coverMediaId,
        media: [{ id: coverMediaId, kind: 'image', storage_path: 'a.webp' }],
        tools: [{ tool_id: 1, role: 'primary' }],
      })
      expect(resEmpty.success).toBe(false)

      const resUntitled = publishCreationSchema.safeParse({
        id: validUuid,
        title: 'Untitled creation',
        category_id: 1,
        cover_media_id: coverMediaId,
        media: [{ id: coverMediaId, kind: 'image', storage_path: 'a.webp' }],
        tools: [{ tool_id: 1, role: 'primary' }],
      })
      expect(resUntitled.success).toBe(false)
    })

    it('rejects if no category is selected', () => {
      const res = publishCreationSchema.safeParse({
        id: validUuid,
        title: 'Valid Title',
        category_id: null,
        cover_media_id: coverMediaId,
        media: [{ id: coverMediaId, kind: 'image', storage_path: 'a.webp' }],
        tools: [{ tool_id: 1, role: 'primary' }],
      })
      expect(res.success).toBe(false)
    })

    it('rejects if cover media is missing or points to a non-uploaded media', () => {
      const resMissing = publishCreationSchema.safeParse({
        id: validUuid,
        title: 'Valid Title',
        category_id: 1,
        cover_media_id: null,
        media: [],
        tools: [{ tool_id: 1, role: 'primary' }],
      })
      expect(resMissing.success).toBe(false)

      const resNotUploaded = publishCreationSchema.safeParse({
        id: validUuid,
        title: 'Valid Title',
        category_id: 1,
        cover_media_id: coverMediaId,
        media: [{ id: coverMediaId, kind: 'image', storage_path: null }],
        tools: [{ tool_id: 1, role: 'primary' }],
      })
      expect(resNotUploaded.success).toBe(false)
    })

    it('rejects if no tool is attached', () => {
      const res = publishCreationSchema.safeParse({
        id: validUuid,
        title: 'Valid Title',
        category_id: 1,
        cover_media_id: coverMediaId,
        media: [{ id: coverMediaId, kind: 'image', storage_path: 'a.webp' }],
        tools: [],
      })
      expect(res.success).toBe(false)
    })

    it('rejects if more than one tool is marked primary', () => {
      const res = publishCreationSchema.safeParse({
        id: validUuid,
        title: 'Valid Title',
        category_id: 1,
        cover_media_id: coverMediaId,
        media: [{ id: coverMediaId, kind: 'image', storage_path: 'a.webp' }],
        tools: [
          { tool_id: 1, role: 'primary', position: 0 },
          { tool_id: 2, role: 'primary', position: 1 },
        ],
      })
      expect(res.success).toBe(false)
    })
  })

  describe('Quick-Create Schemas', () => {
    it('validates quick create prompt', () => {
      expect(
        quickCreatePromptSchema.safeParse({
          title: 'System Prompt',
          body: 'You are an expert developer...',
          kind: 'system',
        }).success
      ).toBe(true)

      expect(
        quickCreatePromptSchema.safeParse({
          title: 'A', // too short
          body: '',
        }).success
      ).toBe(false)
    })

    it('validates quick create resource', () => {
      expect(
        quickCreateResourceSchema.safeParse({
          title: 'Tailwind UI Kit',
          kind: 'ui_kit',
          url: 'https://example.com/kit',
        }).success
      ).toBe(true)

      expect(
        quickCreateResourceSchema.safeParse({
          title: 'T',
          kind: 'invalid_kind',
        }).success
      ).toBe(false)
    })

    it('validates propose tool', () => {
      expect(
        proposeToolSchema.safeParse({
          name: 'Cursor IDE',
          kind: 'ai_app',
          website_url: 'https://cursor.com',
        }).success
      ).toBe(true)

      expect(
        proposeToolSchema.safeParse({
          name: 'C', // too short
        }).success
      ).toBe(false)
    })
  })
})
