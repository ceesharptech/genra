import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { perfLog } from '@/lib/perf'
import type { Database } from '@/types/database'

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
  like_count: number
  save_count: number
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

/**
 * Loads a published creation (or owner draft) for public / visitor viewing.
 */
export const getPublishedCreationBySlug = cache(
  async (slug: string): Promise<CreationWithDetails | null> => {
    const supabase = await createClient()

    const start = performance.now()
    const { data: creation, error } = await supabase
      .from('creations')
      .select(
        `
        *,
        creator:profiles!creations_creator_id_fkey(id, username, display_name, avatar_url),
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
    perfLog('getPublishedCreationBySlug', performance.now() - start)

    if (error || !creation) {
      if (error) console.error('Error fetching published creation:', error)
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
    .is('deleted_at', null)
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
