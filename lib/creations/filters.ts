import { z } from 'zod'

export const sortOptionSchema = z.enum(['trending', 'new', 'popular'])
export type SortOption = z.infer<typeof sortOptionSchema>

export interface DiscoverFilters {
  q: string | null
  category: string | null
  tools: string[]
  sort: SortOption
}

export const DEFAULT_DISCOVER_FILTERS: DiscoverFilters = {
  q: null,
  category: null,
  tools: [],
  sort: 'trending',
}

/**
 * Parses and validates URL search parameters into DiscoverFilters.
 * Ignores unknown or malformed values and falls back safely to defaults.
 */
export function parseDiscoverParams(
  params:
    | Record<string, string | string[] | undefined>
    | URLSearchParams
    | undefined
    | null
): DiscoverFilters {
  if (!params) {
    return { ...DEFAULT_DISCOVER_FILTERS }
  }

  const getParam = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) {
      return params.get(key) || undefined
    }
    const val = params[key]
    if (Array.isArray(val)) {
      return val[0]
    }
    return val
  }

  // Parse q (trimmed, null if empty)
  const rawQ = getParam('q')
  const q = rawQ && rawQ.trim().length > 0 ? rawQ.trim() : null

  // Parse category (slug, trimmed, null if empty)
  const rawCategory = getParam('category')
  const category =
    rawCategory && rawCategory.trim().length > 0
      ? rawCategory.trim().toLowerCase()
      : null

  // Parse tools (comma-separated or multiple values, cleaned & deduplicated)
  let rawTools: string[] = []
  if (params instanceof URLSearchParams) {
    const allTools = params.getAll('tools')
    rawTools = allTools.flatMap((t) => t.split(','))
  } else {
    const val = params['tools']
    if (Array.isArray(val)) {
      rawTools = val.flatMap((t) => (typeof t === 'string' ? t.split(',') : []))
    } else if (typeof val === 'string') {
      rawTools = val.split(',')
    }
  }

  const tools = Array.from(
    new Set(
      rawTools
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && /^[a-z0-9-_]+$/.test(t))
    )
  ).sort()

  // Parse sort (validate against enum, default to 'trending')
  const rawSort = getParam('sort')
  const sortParsed = sortOptionSchema.safeParse(rawSort)
  const sort: SortOption = sortParsed.success ? sortParsed.data : 'trending'

  return {
    q,
    category,
    tools,
    sort,
  }
}

/**
 * Serializes DiscoverFilters into a clean query string.
 * Omits defaults, empty values, and empty arrays.
 * Example: "?category=websites&tools=claude,nextjs"
 */
export function serializeDiscoverParams(
  filters: Partial<DiscoverFilters>
): string {
  const params = new URLSearchParams()

  if (filters.q && filters.q.trim().length > 0) {
    params.set('q', filters.q.trim())
  }

  if (filters.category && filters.category.trim().length > 0) {
    params.set('category', filters.category.trim().toLowerCase())
  }

  if (filters.tools && filters.tools.length > 0) {
    const uniqueTools = Array.from(
      new Set(
        filters.tools
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0)
      )
    ).sort()
    if (uniqueTools.length > 0) {
      params.set('tools', uniqueTools.join(','))
    }
  }

  if (filters.sort && filters.sort !== 'trending') {
    params.set('sort', filters.sort)
  }

  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/**
 * Builds the full URL for the discover page with active filters.
 */
export function buildDiscoverUrl(filters: Partial<DiscoverFilters>): string {
  const qs = serializeDiscoverParams(filters)
  return `/discover${qs}`
}
