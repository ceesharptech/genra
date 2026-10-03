import { describe, it, expect } from 'vitest'
import {
  parseDiscoverParams,
  serializeDiscoverParams,
  buildDiscoverUrl,
} from '@/lib/creations/filters'
import { getMediaUrl } from '@/lib/data/media'

describe('filters module', () => {
  it('parses empty or undefined params into default filters', () => {
    expect(parseDiscoverParams(undefined)).toEqual({
      q: null,
      category: null,
      tools: [],
      sort: 'trending',
    })
    expect(parseDiscoverParams({})).toEqual({
      q: null,
      category: null,
      tools: [],
      sort: 'trending',
    })
  })

  it('parses valid search, category, tools and sort', () => {
    const parsed = parseDiscoverParams({
      q: ' landing page ',
      category: 'WEBSITES',
      tools: 'claude,nextjs,tailwindcss',
      sort: 'new',
    })

    expect(parsed).toEqual({
      q: 'landing page',
      category: 'websites',
      tools: ['claude', 'nextjs', 'tailwindcss'],
      sort: 'new',
    })
  })

  it('handles array format and duplicates in tools', () => {
    const parsed = parseDiscoverParams({
      tools: ['claude,nextjs', 'nextjs', 'midjourney'],
    })

    expect(parsed.tools).toEqual(['claude', 'midjourney', 'nextjs'])
  })

  it('ignores invalid or unknown sort options and falls back to trending', () => {
    const parsed = parseDiscoverParams({
      sort: 'invalid_sort' as unknown as string,
    })
    expect(parsed.sort).toBe('trending')
  })

  it('serializes filters omitting defaults and empty values', () => {
    expect(
      serializeDiscoverParams({
        q: '',
        category: null,
        tools: [],
        sort: 'trending',
      })
    ).toBe('')

    expect(
      serializeDiscoverParams({
        q: 'design',
        category: 'websites',
        tools: ['nextjs', 'claude'],
        sort: 'popular',
      })
    ).toBe('?q=design&category=websites&tools=claude%2Cnextjs&sort=popular')
  })

  it('builds full discover URLs properly', () => {
    expect(buildDiscoverUrl({})).toBe('/discover')
    expect(buildDiscoverUrl({ category: 'apps' })).toBe('/discover?category=apps')
  })
})

describe('media module', () => {
  it('handles null, undefined and empty strings', () => {
    expect(getMediaUrl(null)).toBeNull()
    expect(getMediaUrl(undefined)).toBeNull()
    expect(getMediaUrl('')).toBeNull()
  })

  it('preserves full external URLs', () => {
    expect(getMediaUrl('https://example.com/image.png')).toBe(
      'https://example.com/image.png'
    )
    expect(getMediaUrl('http://youtube.com/watch?v=123')).toBe(
      'http://youtube.com/watch?v=123'
    )
  })

  it('constructs Supabase storage public URLs for bucket paths', () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://xyz.supabase.co'

    const url = getMediaUrl('user123/creation456/cover.png')
    expect(url).toBe(
      'https://xyz.supabase.co/storage/v1/object/public/creation-media/user123/creation456/cover.png'
    )

    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
  })
})
