import { describe, it, expect } from 'vitest'
import {
  uuidSchema,
  slugSchema,
  usernameSchema,
  titleSchema,
  urlSchema,
} from '@/lib/validation/common'

describe('Common Validation Schemas', () => {
  describe('uuidSchema', () => {
    it('accepts valid UUIDs', () => {
      expect(
        uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000').success
      ).toBe(true)
    })

    it('rejects invalid strings', () => {
      expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false)
    })
  })

  describe('slugSchema', () => {
    it('accepts valid slugs', () => {
      expect(slugSchema.safeParse('minimal-design-system').success).toBe(true)
      expect(slugSchema.safeParse('claude-code-123').success).toBe(true)
    })

    it('rejects invalid slugs (uppercase, spaces, special chars)', () => {
      expect(slugSchema.safeParse('Minimal-Design').success).toBe(false)
      expect(slugSchema.safeParse('minimal design').success).toBe(false)
      expect(slugSchema.safeParse('-leading-hyphen').success).toBe(false)
      expect(slugSchema.safeParse('trailing-hyphen-').success).toBe(false)
    })
  })

  describe('usernameSchema', () => {
    it('accepts valid usernames matching DB regex ^[a-zA-Z0-9_]{3,30}$', () => {
      expect(usernameSchema.safeParse('john_doe').success).toBe(true)
      expect(usernameSchema.safeParse('Creator99').success).toBe(true)
    })

    it('rejects usernames that are too short, too long, or have symbols', () => {
      expect(usernameSchema.safeParse('ab').success).toBe(false)
      expect(usernameSchema.safeParse('a'.repeat(31)).success).toBe(false)
      expect(usernameSchema.safeParse('user-name').success).toBe(false) // hyphens not allowed by DB check
      expect(usernameSchema.safeParse('user@name').success).toBe(false)
    })
  })

  describe('titleSchema', () => {
    it('accepts valid titles', () => {
      expect(titleSchema.safeParse('AI Workflow').success).toBe(true)
    })

    it('trims whitespace and rejects short or empty titles', () => {
      expect(titleSchema.safeParse('  A  ').success).toBe(false)
      expect(titleSchema.safeParse('').success).toBe(false)
    })
  })

  describe('urlSchema', () => {
    it('accepts http and https URLs', () => {
      expect(urlSchema.safeParse('https://genra.dev').success).toBe(true)
      expect(urlSchema.safeParse('http://localhost:3000').success).toBe(true)
    })

    it('rejects javascript: and relative URLs', () => {
      expect(urlSchema.safeParse('javascript:alert(1)').success).toBe(false)
      expect(urlSchema.safeParse('/relative/path').success).toBe(false)
    })
  })
})
