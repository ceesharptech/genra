import { cache } from 'react';
import { createPublicClient } from '@/lib/supabase/public';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import type { CreationCardItem } from '@/lib/data/creations';

export interface PromptCardItem {
  id: string;
  title: string;
  body_preview: string;
  kind: Database['public']['Enums']['prompt_kind'];
  model_tool_name: string | null;
  model_tool_slug: string | null;
  author_username: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  like_count: number;
  save_count: number;
  copy_count: number;
  created_at: string;
  used_in_count: number;
  fork_of_id: string | null;
}

export interface ResourceCardItem {
  id: string;
  kind: Database['public']['Enums']['resource_kind'];
  title: string;
  description_preview: string;
  url_host: string | null;
  author_username: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  tool_name: string | null;
  tool_slug: string | null;
  like_count: number;
  save_count: number;
  created_at: string;
  used_in_count: number;
}

export interface PromptDetail {
  id: string;
  title: string;
  body: string;
  kind: Database['public']['Enums']['prompt_kind'];
  model_tool_id: number | null;
  fork_of_id: string | null;
  is_public: boolean;
  like_count: number;
  save_count: number;
  copy_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  moderation_locked?: boolean | null;
  used_in_count: number;
  author: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    headline: string | null;
    bio: string | null;
  };
  model_tool: {
    id: number;
    name: string;
    slug: string;
    kind: Database['public']['Enums']['tool_kind'];
    vendor: string | null;
    logo_url: string | null;
  } | null;
  fork_parent: {
    id: string;
    title: string;
    is_public: boolean;
    deleted_at: string | null;
    author: {
      id: string;
      username: string;
      display_name: string | null;
    };
  } | null;
}

export interface ResourceDetail {
  id: string;
  kind: Database['public']['Enums']['resource_kind'];
  title: string;
  description: string | null;
  url: string | null;
  body: string | null;
  tool_id: number | null;
  is_public: boolean;
  like_count: number;
  save_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  moderation_locked?: boolean | null;
  used_in_count: number;
  author: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    headline: string | null;
    bio: string | null;
  };
  tool: {
    id: number;
    name: string;
    slug: string;
    kind: Database['public']['Enums']['tool_kind'];
    vendor: string | null;
    logo_url: string | null;
  } | null;
}

export interface ToolPageData {
  id: number;
  slug: string;
  name: string;
  kind: Database['public']['Enums']['tool_kind'];
  vendor: string | null;
  website_url: string | null;
  logo_url: string | null;
  is_verified: boolean;
  created_at: string;
  parent: {
    id: number;
    name: string;
    slug: string;
    kind: Database['public']['Enums']['tool_kind'];
    vendor: string | null;
    logo_url: string | null;
    is_verified: boolean;
  } | null;
  children: Array<{
    id: number;
    name: string;
    slug: string;
    kind: Database['public']['Enums']['tool_kind'];
    vendor: string | null;
    logo_url: string | null;
    is_verified: boolean;
  }>;
  related_tools: Array<{
    id: number;
    name: string;
    slug: string;
    kind: Database['public']['Enums']['tool_kind'];
    vendor: string | null;
    logo_url: string | null;
    is_verified: boolean;
    relation: string;
  }>;
  published_creations_count: number;
  public_prompts_count: number;
  public_resources_count: number;
}

// -----------------------------------------------------------------------------
// Prompts Discovery
// -----------------------------------------------------------------------------

export const discoverPrompts = cache(
  async (params: {
    q?: string;
    toolSlug?: string;
    sort?: 'popular' | 'new';
    authorUsername?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: PromptCardItem[]; error: string | null }> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc('discover_prompts', {
      q: params.q || undefined,
      p_tool_slug: params.toolSlug || undefined,
      p_sort: params.sort || 'popular',
      p_author_username: params.authorUsername || undefined,
      p_limit: params.limit || 24,
      p_offset: params.offset || 0,
    });

    if (error) {
      console.error('discoverPrompts error:', error);
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  }
);

// -----------------------------------------------------------------------------
// Resources Discovery
// -----------------------------------------------------------------------------

export const discoverResources = cache(
  async (params: {
    q?: string;
    kind?: Database['public']['Enums']['resource_kind'];
    toolSlug?: string;
    sort?: 'popular' | 'new';
    authorUsername?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: ResourceCardItem[]; error: string | null }> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc('discover_resources', {
      q: params.q || undefined,
      p_kind: params.kind || undefined,
      p_tool_slug: params.toolSlug || undefined,
      p_sort: params.sort || 'popular',
      p_author_username: params.authorUsername || undefined,
      p_limit: params.limit || 24,
      p_offset: params.offset || 0,
    });

    if (error) {
      console.error('discoverResources error:', error);
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  }
);

// -----------------------------------------------------------------------------
// Prompt Detail
// -----------------------------------------------------------------------------

export const getPrompt = cache(
  async (
    id: string,
    viewerId?: string | null
  ): Promise<{ data: PromptDetail | null; error: string | null }> => {
    const supabase = createPublicClient();

    // Verified constraint hints:
    // - profiles!prompts_author_id_fkey
    // - tools!prompts_model_tool_id_fkey
    // - prompts!prompts_fork_of_id_fkey
    const { data, error } = await supabase
      .from('prompts')
      .select(`
        id,
        title,
        body,
        kind,
        model_tool_id,
        fork_of_id,
        is_public,
        like_count,
        save_count,
        copy_count,
        created_at,
        updated_at,
        deleted_at,
        moderation_locked,
        author:profiles!prompts_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          headline,
          bio
        ),
        model_tool:tools!prompts_model_tool_id_fkey (
          id,
          name,
          slug,
          kind,
          vendor,
          logo_url
        ),
        fork_parent:prompts!prompts_fork_of_id_fkey (
          id,
          title,
          is_public,
          deleted_at,
          author:profiles!prompts_author_id_fkey (
            id,
            username,
            display_name
          )
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('getPrompt error:', error);
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: null };
    }

    // Soft-deleted or private prompts are invisible to visitors (only visible to author)
    const isAuthor = Boolean(viewerId && viewerId === data.author.id);
    if ((data.deleted_at !== null || !data.is_public) && !isAuthor) {
      return { data: null, error: null };
    }

    // Get count of published creations using this prompt
    const { count } = await supabase
      .from('creation_prompts')
      .select('creation:creations!creation_prompts_creation_id_fkey(id)', { count: 'exact', head: true })
      .eq('prompt_id', id);

    const promptDetail: PromptDetail = {
      id: data.id,
      title: data.title,
      body: data.body,
      kind: data.kind,
      model_tool_id: data.model_tool_id,
      fork_of_id: data.fork_of_id,
      is_public: data.is_public,
      like_count: data.like_count,
      save_count: data.save_count,
      copy_count: data.copy_count,
      created_at: data.created_at,
      updated_at: data.updated_at,
      deleted_at: data.deleted_at,
      moderation_locked: Boolean(data.moderation_locked),
      used_in_count: count ?? 0,
      author: data.author,
      model_tool: data.model_tool,
      fork_parent: (() => {
        const parent = Array.isArray(data.fork_parent)
          ? data.fork_parent[0] ?? null
          : data.fork_parent;
        return parent && parent.is_public && !parent.deleted_at ? parent : null;
      })(),
    };

    return { data: promptDetail, error: null };
  }
);

// -----------------------------------------------------------------------------
// Resource Detail
// -----------------------------------------------------------------------------

export const getResource = cache(
  async (
    id: string,
    viewerId?: string | null
  ): Promise<{ data: ResourceDetail | null; error: string | null }> => {
    const supabase = createPublicClient();

    // Verified constraint hints:
    // - profiles!resources_author_id_fkey
    // - tools!resources_tool_id_fkey
    const { data, error } = await supabase
      .from('resources')
      .select(`
        id,
        kind,
        title,
        description,
        url,
        body,
        tool_id,
        is_public,
        like_count,
        save_count,
        created_at,
        updated_at,
        deleted_at,
        moderation_locked,
        author:profiles!resources_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          headline,
          bio
        ),
        tool:tools!resources_tool_id_fkey (
          id,
          name,
          slug,
          kind,
          vendor,
          logo_url
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('getResource error:', error);
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: null };
    }

    const isAuthor = Boolean(viewerId && viewerId === data.author.id);
    if ((data.deleted_at !== null || !data.is_public) && !isAuthor) {
      return { data: null, error: null };
    }

    // Get count of published creations using this resource
    const { count } = await supabase
      .from('creation_resources')
      .select('creation:creations!creation_resources_creation_id_fkey(id)', { count: 'exact', head: true })
      .eq('resource_id', id);

    const resourceDetail: ResourceDetail = {
      id: data.id,
      kind: data.kind,
      title: data.title,
      description: data.description,
      url: data.url,
      body: data.body,
      tool_id: data.tool_id,
      is_public: data.is_public,
      like_count: data.like_count,
      save_count: data.save_count,
      created_at: data.created_at,
      updated_at: data.updated_at,
      deleted_at: data.deleted_at,
      moderation_locked: Boolean(data.moderation_locked),
      used_in_count: count ?? 0,
      author: data.author,
      tool: data.tool,
    };

    return { data: resourceDetail, error: null };
  }
);

// -----------------------------------------------------------------------------
// Creations Using Item (Prompts or Resources)
// -----------------------------------------------------------------------------

export const creationsUsingItem = cache(
  async (
    targetType: 'prompt' | 'resource',
    targetId: string,
    limit = 24,
    offset = 0
  ): Promise<{ data: CreationCardItem[]; error: string | null }> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc('creations_using_item', {
      p_target_type: targetType,
      p_target_id: targetId,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error('creationsUsingItem error:', error);
      return { data: [], error: error.message };
    }

    return { data: (data as unknown as CreationCardItem[]) || [], error: null };
  }
);

// -----------------------------------------------------------------------------
// Tool Page
// -----------------------------------------------------------------------------

export const getToolPage = cache(
  async (slug: string): Promise<{ data: ToolPageData | null; error: string | null }> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc('tool_page', {
      p_slug: slug,
    });

    if (error) {
      console.error('getToolPage error:', error);
      return { data: null, error: error.message };
    }

    return { data: (data as unknown as ToolPageData) || null, error: null };
  }
);

// -----------------------------------------------------------------------------
// Saved Prompts & Saved Resources (Authenticated)
// -----------------------------------------------------------------------------

export const savedPrompts = async (
  limit = 24,
  offset = 0
): Promise<{ data: PromptCardItem[]; error: string | null }> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('saved_prompts', {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error('savedPrompts error:', error);
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
};

export const savedResources = async (
  limit = 24,
  offset = 0
): Promise<{ data: ResourceCardItem[]; error: string | null }> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('saved_resources', {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error('savedResources error:', error);
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
};

// -----------------------------------------------------------------------------
// Profile Library Tab (Prompts + Resources)
// -----------------------------------------------------------------------------

export interface UserLibraryData {
  prompts: PromptCardItem[];
  resources: ResourceCardItem[];
}

export const listUserLibrary = cache(
  async (
    username: string,
    isOwner = false
  ): Promise<{ data: UserLibraryData; error: string | null }> => {
    // Parallel fetch: user's prompts and resources
    const [promptsRes, resourcesRes] = await Promise.all([
      discoverPrompts({ authorUsername: username, limit: 60 }),
      discoverResources({ authorUsername: username, limit: 60 }),
    ]);

    if (promptsRes.error || resourcesRes.error) {
      return {
        data: { prompts: [], resources: [] },
        error: promptsRes.error || resourcesRes.error,
      };
    }

    let prompts = promptsRes.data;
    let resources = resourcesRes.data;

    // If owner, also fetch any private prompts/resources they own
    if (isOwner) {
      const supabase = await createClient();
      const { data: privPrompts } = await supabase
        .from('prompts')
        .select(`
          id,
          title,
          body,
          kind,
          model_tool_id,
          like_count,
          save_count,
          copy_count,
          created_at,
          fork_of_id,
          author:profiles!prompts_author_id_fkey(username, display_name, avatar_url),
          model_tool:tools!prompts_model_tool_id_fkey(name, slug)
        `)
        .eq('is_public', false)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      const { data: privResources } = await supabase
        .from('resources')
        .select(`
          id,
          kind,
          title,
          description,
          url,
          body,
          tool_id,
          like_count,
          save_count,
          created_at,
          author:profiles!resources_author_id_fkey(username, display_name, avatar_url),
          tool:tools!resources_tool_id_fkey(name, slug)
        `)
        .eq('is_public', false)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (privPrompts && privPrompts.length > 0) {
        const mappedPrivPrompts: PromptCardItem[] = privPrompts.map((p) => ({
          id: p.id,
          title: p.title,
          body_preview: p.body.slice(0, 220),
          kind: p.kind,
          model_tool_name: p.model_tool?.name ?? null,
          model_tool_slug: p.model_tool?.slug ?? null,
          author_username: p.author.username,
          author_display_name: p.author.display_name,
          author_avatar_url: p.author.avatar_url,
          like_count: p.like_count,
          save_count: p.save_count,
          copy_count: p.copy_count,
          created_at: p.created_at,
          used_in_count: 0,
          fork_of_id: p.fork_of_id,
        }));
        prompts = [...mappedPrivPrompts, ...prompts];
      }

      if (privResources && privResources.length > 0) {
        const mappedPrivResources: ResourceCardItem[] = privResources.map((r) => {
          let host: string | null = null;
          if (r.url) {
            try {
              host = new URL(r.url).hostname;
            } catch {
              host = null;
            }
          }
          return {
            id: r.id,
            kind: r.kind,
            title: r.title,
            description_preview: (r.description || r.body || '').slice(0, 220),
            url_host: host,
            tool_name: r.tool?.name ?? null,
            tool_slug: r.tool?.slug ?? null,
            author_username: r.author.username,
            author_display_name: r.author.display_name,
            author_avatar_url: r.author.avatar_url,
            like_count: r.like_count,
            save_count: r.save_count,
            created_at: r.created_at,
            used_in_count: 0,
          };
        });
        resources = [...mappedPrivResources, ...resources];
      }
    }

    return {
      data: { prompts, resources },
      error: null,
    };
  }
);
