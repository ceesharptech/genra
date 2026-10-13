import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
import { perfLog } from '@/lib/perf'
import type { Database } from '@/types/database'

export { getMediaUrl } from '@/lib/data/media'

export type Category = Database['public']['Tables']['categories']['Row']
export type Tool = Database['public']['Tables']['tools']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type ProcessStep = Database['public']['Tables']['process_steps']['Row']
export type CreationMedia = Database['public']['Tables']['creation_media']['Row']
export type Prompt = Database['public']['Tables']['prompts']['Row']
export type Resource = Database['public']['Tables']['resources']['Row']
export type ResourceKind = Database['public']['Enums']['resource_kind']
export type CreationStatus = Database['public']['Enums']['creation_status']

export interface CreationWithDetails {
  id: string
  creator_id: string
  slug: string
  title: string
  summary: string | null
  description: string | null
  category_id: number | null
  status: CreationStatus
  live_url: string | null
  repo_url: string | null
  cover_media_id: string | null
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
  published_at: string | null
  moderation_locked?: boolean | null
  like_count: number
  save_count: number
  share_count: number
  comment_count: number
  view_count: number
  creator?: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  category?: Category | null
  tools: Array<{
    tool_id: number
    role: string
    version: string | null
    position: number
    tool: Tool
  }>
  tags: Array<{
    tag_id: number
    source: string
    tag: Tag
  }>
  steps: ProcessStep[]
  media: CreationMedia[]
  prompts: Array<{
    prompt_id: string
    step_id: string | null
    position: number
    note: string | null
    prompt: {
      id: string
      title: string
      body: string
      kind: Database['public']['Enums']['prompt_kind']
      copy_count: number
      author?: {
        id: string
        username: string
        display_name: string | null
      } | null
    }
  }>
  resources: Array<{
    resource_id: string
    position: number
    note: string | null
    resource: {
      id: string
      title: string
      kind: Database['public']['Enums']['resource_kind']
      url: string | null
      description: string | null
      author?: {
        id: string
        username: string
        display_name: string | null
      } | null
    }
  }>
}

/**
 * Returns all active categories ordered by display sort_order.
 */
export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching categories:', error)
    return []
  }
  return data || []
}

/**
 * Typeahead search over tools. Verified tools appear first, followed by alphabetical.
 */
export async function searchTools(q = ''): Promise<Tool[]> {
  const supabase = await createClient()
  let query = supabase
    .from('tools')
    .select('*')
    .order('is_verified', { ascending: false })
    .order('name', { ascending: true })
    .limit(20)

  if (q.trim()) {
    query = query.ilike('name', `%${q.trim()}%`)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error searching tools:', error)
    return []
  }
  return data || []
}

/**
 * Loads a creation and all its relational sub-items for editing.
 * Returns null if not found or if caller is not the owner.
 */
export async function getCreationForEdit(slug: string): Promise<CreationWithDetails | null> {
  const supabase = await createClient()

  // 1. Fetch creation row
  const { data: creation, error } = await supabase
    .from('creations')
    .select(
      `
      *,
      category:categories(*),
      tools:creation_tools(
        tool_id,
        role,
        version,
        position,
        tool:tools(*)
      ),
      tags:creation_tags(
        tag_id,
        source,
        tag:tags(*)
      ),
      steps:process_steps(
        id,
        creation_id,
        position,
        title,
        body,
        created_at
      ),
      media:creation_media!creation_media_creation_id_fkey(
        id,
        creation_id,
        kind,
        role,
        storage_path,
        external_url,
        mime_type,
        width,
        height,
        duration_ms,
        alt_text,
        caption,
        position,
        step_id,
        created_at
      ),
      prompts:creation_prompts(
        prompt_id,
        step_id,
        position,
        note,
        prompt:prompts(
          id,
          title,
          body,
          kind,
          copy_count,
          author:profiles!prompts_author_id_fkey(id, username, display_name)
        )
      ),
      resources:creation_resources(
        resource_id,
        position,
        note,
        resource:resources(
          id,
          title,
          kind,
          url,
          description,
          author:profiles!resources_author_id_fkey(id, username, display_name)
        )
      )
    `
    )
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !creation) {
    if (error) console.error('Error loading creation for edit:', error)
    return null
  }

  // Sort sub-items by position
  const steps = (creation.steps || []).sort(
    (a: ProcessStep, b: ProcessStep) => a.position - b.position
  )
  const mediaList = Array.isArray(creation.media)
    ? (creation.media as CreationMedia[])
    : []
  const media = mediaList.sort(
    (a: CreationMedia, b: CreationMedia) => a.position - b.position
  )
  const tools = (creation.tools || []).sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position
  )
  const prompts = (creation.prompts || []).sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position
  )
  const resources = (creation.resources || []).sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position
  )

  return {
    ...creation,
    attributes: (creation.attributes as Record<string, unknown>) || {},
    steps,
    media,
    tools,
    tags: creation.tags || [],
    prompts,
    resources,
  } as unknown as CreationWithDetails
}

export interface CreationCardItem {
  id: string
  slug: string
  title: string
  summary: string | null
  published_at: string
  like_count: number
  comment_count: number
  view_count: number
  category_slug: string | null
  category_name: string | null
  cover_storage_path: string | null
  cover_width: number | null
  cover_height: number | null
  cover_alt: string | null
  creator_username: string
  creator_display_name: string | null
  creator_avatar_url: string | null
  tools: Array<{
    name: string
    slug: string
  }>
  tool_count: number
}

export interface PopularToolItem {
  slug: string
  name: string
  kind: string
  creation_count: number
}

export interface CategoryCountItem {
  slug: string
  name: string
  parent_slug: string | null
  creation_count: number
}

export interface DiscoverCardsParams {
  q?: string | null
  category?: string | null
  tool_slugs?: string[] | null
  sort?: 'trending' | 'new' | 'popular'
  creator_username?: string | null
  limit?: number
  offset?: number
}

/**
 * Fetches discovery cards via the optimized discover_cards RPC.
 * Uses the cookie-less public client for cache-eligibility and minimal latency.
 */
export const discoverCards = cache(
  async (
    params: DiscoverCardsParams = {}
  ): Promise<{ data: CreationCardItem[]; hasMore: boolean; error: string | null }> => {
    const supabase = createPublicClient()
    const limit = Math.min(Math.max(params.limit ?? 24, 1), 60)
    const offset = Math.max(params.offset ?? 0, 0)

    const start = performance.now()
    const { data, error } = await supabase.rpc('discover_cards', {
      q: params.q?.trim() || undefined,
      p_category: params.category?.trim() || undefined,
      p_tool_slugs:
        params.tool_slugs && params.tool_slugs.length > 0
          ? params.tool_slugs
          : undefined,
      p_sort: params.sort || 'trending',
      p_creator_username: params.creator_username?.trim() || undefined,
      p_limit: limit + 1,
      p_offset: offset,
    })
    perfLog('discoverCards', performance.now() - start)

    if (error) {
      console.error('Error fetching discover cards:', error)
      return {
        data: [],
        hasMore: false,
        error: error.message || 'Failed to fetch creations',
      }
    }

    const rows = (data || []) as unknown as CreationCardItem[]
    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows

    const formatted = items.map((item) => ({
      ...item,
      tools: Array.isArray(item.tools) ? item.tools : [],
    }))

    return { data: formatted, hasMore, error: null }
  }
)

/**
 * Fetches related creations for a given creation ID.
 */
export const relatedCreations = cache(
  async (
    creationId: string,
    limit = 6
  ): Promise<{ data: CreationCardItem[]; error: string | null }> => {
    const supabase = createPublicClient()
    const start = performance.now()
    const { data, error } = await supabase.rpc('related_creations', {
      p_creation_id: creationId,
      p_limit: limit,
    })
    perfLog('relatedCreations', performance.now() - start)

    if (error) {
      console.error('Error fetching related creations:', error)
      return {
        data: [],
        error: error.message || 'Failed to fetch related creations',
      }
    }

    const rows = (data || []) as unknown as CreationCardItem[]
    const formatted = rows.map((item) => ({
      ...item,
      tools: Array.isArray(item.tools) ? item.tools : [],
    }))

    return { data: formatted, error: null }
  }
)

/**
 * Fetches popular tools used by published creations.
 */
export const popularTools = cache(
  async (
    limit = 30
  ): Promise<{ data: PopularToolItem[]; error: string | null }> => {
    const supabase = createPublicClient()
    const start = performance.now()
    const { data, error } = await supabase.rpc('popular_tools', {
      p_limit: limit,
    })
    perfLog('popularTools', performance.now() - start)

    if (error) {
      console.error('Error fetching popular tools:', error)
      return {
        data: [],
        error: error.message || 'Failed to fetch popular tools',
      }
    }

    return { data: (data || []) as PopularToolItem[], error: null }
  }
)

/**
 * Fetches published creation counts grouped by category.
 */
export const categoryCounts = cache(
  async (): Promise<{ data: CategoryCountItem[]; error: string | null }> => {
    const supabase = createPublicClient()
    const start = performance.now()
    const { data, error } = await supabase.rpc('category_counts')
    perfLog('categoryCounts', performance.now() - start)

    if (error) {
      console.error('Error fetching category counts:', error)
      return {
        data: [],
        error: error.message || 'Failed to fetch category counts',
      }
    }

    return { data: (data || []) as CategoryCountItem[], error: null }
  }
)

const DETAIL_SELECT = `
  *,
  creator:profiles!creations_creator_id_fkey(id, username, display_name, avatar_url, bio, headline),
  category:categories(*),
  tools:creation_tools(
    tool_id,
    role,
    version,
    position,
    tool:tools(*)
  ),
  tags:creation_tags(
    tag_id,
    source,
    tag:tags(*)
  ),
  steps:process_steps(
    id,
    creation_id,
    position,
    title,
    body,
    created_at
  ),
  media:creation_media!creation_media_creation_id_fkey(
    id,
    creation_id,
    kind,
    role,
    storage_path,
    external_url,
    mime_type,
    width,
    height,
    duration_ms,
    alt_text,
    caption,
    position,
    step_id,
    created_at
  ),
  cover:creation_media!creations_cover_fk(
    id,
    kind,
    role,
    storage_path,
    external_url,
    mime_type,
    width,
    height,
    alt_text,
    caption
  ),
  prompts:creation_prompts(
    prompt_id,
    step_id,
    position,
    note,
    prompt:prompts(
      id,
      title,
      body,
      kind,
      copy_count,
      model_tool:tools!prompts_model_tool_id_fkey(id, name, slug)
    )
  ),
  resources:creation_resources(
    resource_id,
    position,
    note,
    resource:resources(
      id,
      title,
      kind,
      url,
      description,
      storage_path,
      tool:tools!resources_tool_id_fkey(id, name, slug)
    )
  )
`

// Helper to format raw joined creation into CreationWithDetails
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatCreationDetail(creation: any): CreationWithDetails {
  const steps = (creation.steps || []).sort(
    (a: ProcessStep, b: ProcessStep) => a.position - b.position
  )
  const mediaList = Array.isArray(creation.media)
    ? (creation.media as CreationMedia[])
    : []
  const media = mediaList.sort(
    (a: CreationMedia, b: CreationMedia) => a.position - b.position
  )
  const tools = (creation.tools || []).sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position
  )
  const prompts = (creation.prompts || []).sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position
  )
  const resources = (creation.resources || []).sort(
    (a: { position: number }, b: { position: number }) => a.position - b.position
  )

  return {
    ...creation,
    attributes: (creation.attributes as Record<string, unknown>) || {},
    steps,
    media,
    tools,
    tags: creation.tags || [],
    prompts,
    resources,
  } as unknown as CreationWithDetails
}

/**
 * Loads a published creation (or owner draft) for public / visitor viewing.
 * First tries cookie-less public client; falls back to authenticated client
 * if not found publicly to permit author preview of drafts/archived items.
 */
export const getPublishedCreationBySlug = cache(
  async (slug: string): Promise<CreationWithDetails | null> => {
    const publicClient = createPublicClient()
    const start = performance.now()
    const { data: publicCreation, error: publicError } = await publicClient
      .from('creations')
      .select(DETAIL_SELECT)
      .eq('slug', slug)
      .eq('status', 'published')
      .is('deleted_at', null)
      .maybeSingle()
    perfLog('getPublishedCreationBySlug (public)', performance.now() - start)

    if (publicCreation) {
      return formatCreationDetail(publicCreation)
    }

    if (publicError) {
      console.error('Error fetching published creation publicly:', publicError)
    }

    // Fallback: check if the visitor is the authenticated owner of a draft/archived creation
    const authClient = await createClient()
    const authStart = performance.now()
    const { data: authCreation, error: authError } = await authClient
      .from('creations')
      .select(DETAIL_SELECT)
      .eq('slug', slug)
      .is('deleted_at', null)
      .maybeSingle()
    perfLog('getPublishedCreationBySlug (auth fallback)', performance.now() - authStart)

    if (authError || !authCreation) {
      return null
    }

    return formatCreationDetail(authCreation)
  }
)

export interface CreationOgData {
  title: string
  updated_at: string
  creator_display_name: string | null
  creator_username: string
  cover_storage_path: string | null
  cover_external_url: string | null
  tools: string[]
}

/**
 * Lean single-query loader for OpenGraph preview images.
 * Uses the cookie-less public client and only selects the essential
 * fields needed to render the 1200x630 card.
 */
export const getCreationOgData = cache(
  async (slug: string): Promise<CreationOgData | null> => {
    const publicClient = createPublicClient()
    const { data, error } = await publicClient
      .from('creations')
      .select(`
        title,
        updated_at,
        creator:profiles!creations_creator_id_fkey(username, display_name),
        cover:creation_media!creations_cover_fk(storage_path, external_url),
        tools:creation_tools(
          position,
          source,
          tool:tools(name)
        )
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .is('deleted_at', null)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawTools = ((data.tools as any[]) || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((t: any) => t.source !== 'ai_suggested')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((t: any) => t.tool?.name)
      .filter(Boolean) as string[]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const creator = (Array.isArray(data.creator) ? data.creator[0] : data.creator) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cover = (Array.isArray(data.cover) ? data.cover[0] : data.cover) as any

    return {
      title: data.title,
      updated_at: data.updated_at,
      creator_display_name: creator?.display_name || null,
      creator_username: creator?.username || 'creator',
      cover_storage_path: cover?.storage_path || null,
      cover_external_url: cover?.external_url || null,
      tools: rawTools.slice(0, 3),
    }
  }
)


export interface DashboardCreationItem {
  id: string
  slug: string
  title: string
  summary: string | null
  status: CreationStatus
  created_at: string
  updated_at: string
  published_at: string | null
  categoryName: string
  coverStoragePath: string | null
  toolCount: number
  stepCount: number
}

export interface ListMyCreationsResult {
  data: DashboardCreationItem[]
  error: string | null
}

/**
 * Returns creations owned by the creator for the /creations dashboard.
 */
export async function listMyCreations(
  creatorId: string
): Promise<ListMyCreationsResult> {
  const supabase = await createClient()

  const start = performance.now()
  const { data, error } = await supabase
    .from('creations')
    .select(
      `
      id,
      slug,
      title,
      summary,
      status,
      moderation_locked,
      created_at,
      updated_at,
      published_at,
      cover_media_id,
      category:categories(name, slug),
      cover_media:creation_media!creations_cover_fk(id, storage_path, external_url, kind),
      tools:creation_tools(tool_id),
      steps:process_steps(id)
    `
    )
    .eq('creator_id', creatorId)
    .or('deleted_at.is.null,moderation_locked.eq.true')
    .order('updated_at', { ascending: false })
  perfLog('listMyCreations', performance.now() - start)

  if (error) {
    console.error('Error fetching my creations:', error)
    return { data: [], error: error.message || 'Failed to fetch creations' }
  }

  interface RawDashboardRow {
    id: string
    slug: string
    title: string
    summary: string | null
    status: CreationStatus
    moderation_locked?: boolean | null
    created_at: string
    updated_at: string
    published_at: string | null
    category?: { name: string; slug: string } | null
    cover_media?: {
      id: string
      storage_path: string | null
      external_url: string | null
      kind: string
    } | null
    tools?: { tool_id: number }[] | null
    steps?: { id: string }[] | null
  }

  const items = ((data as unknown as RawDashboardRow[]) || []).map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    status: c.status,
    moderation_locked: Boolean(c.moderation_locked),
    created_at: c.created_at,
    updated_at: c.updated_at,
    published_at: c.published_at,
    categoryName: c.category?.name || 'Uncategorized',
    coverStoragePath: c.cover_media?.storage_path || null,
    toolCount: c.tools?.length || 0,
    stepCount: c.steps?.length || 0,
  }))

  return { data: items, error: null }
}

/**
 * Searches prompts for the prompt picker dialog.
 */
export async function searchPrompts(q = '', limit = 20) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_prompts', {
    q: q.trim() || undefined,
    p_limit: limit,
  })

  if (error) {
    console.error('Error searching prompts:', error)
    return []
  }
  return data || []
}

/**
 * Searches resources for the resource picker dialog.
 */
export async function searchResources(
  q = '',
  kind?: ResourceKind,
  limit = 20
) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_resources', {
    q: q.trim() || undefined,
    p_kind: kind || undefined,
    p_limit: limit,
  })

  if (error) {
    console.error('Error searching resources:', error)
    return []
  }
  return data || []
}
