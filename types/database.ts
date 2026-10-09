export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          creation_id: string | null
          error: string | null
          id: string
          input: Json
          kind: Database["public"]["Enums"]["ai_job_kind"]
          model: string | null
          output: Json | null
          provider: string | null
          requested_by: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["ai_job_status"]
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          creation_id?: string | null
          error?: string | null
          id?: string
          input?: Json
          kind: Database["public"]["Enums"]["ai_job_kind"]
          model?: string | null
          output?: Json | null
          provider?: string | null
          requested_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_job_status"]
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          creation_id?: string | null
          error?: string | null
          id?: string
          input?: Json
          kind?: Database["public"]["Enums"]["ai_job_kind"]
          model?: string | null
          output?: Json | null
          provider?: string | null
          requested_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ai_job_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: number
          name: string
          parent_id: number | null
          slug: string
          sort_order: number
        }
        Insert: {
          id?: never
          name: string
          parent_id?: number | null
          slug: string
          sort_order?: number
        }
        Update: {
          id?: never
          name?: string
          parent_id?: number | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          added_at: string
          collection_id: string
          note: string | null
          position: number
          target_id: string
          target_type: Database["public"]["Enums"]["engagement_target"]
        }
        Insert: {
          added_at?: string
          collection_id: string
          note?: string | null
          position?: number
          target_id: string
          target_type: Database["public"]["Enums"]["engagement_target"]
        }
        Update: {
          added_at?: string
          collection_id?: string
          note?: string | null
          position?: number
          target_id?: string
          target_type?: Database["public"]["Enums"]["engagement_target"]
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          creation_id: string
          deleted_at: string | null
          id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          creation_id: string
          deleted_at?: string | null
          id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          creation_id?: string
          deleted_at?: string | null
          id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      creation_media: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          creation_id: string
          duration_ms: number | null
          external_url: string | null
          height: number | null
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          mime_type: string | null
          position: number
          role: Database["public"]["Enums"]["media_role"]
          step_id: string | null
          storage_path: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          creation_id: string
          duration_ms?: number | null
          external_url?: string | null
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          mime_type?: string | null
          position?: number
          role?: Database["public"]["Enums"]["media_role"]
          step_id?: string | null
          storage_path?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          creation_id?: string
          duration_ms?: number | null
          external_url?: string | null
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          mime_type?: string | null
          position?: number
          role?: Database["public"]["Enums"]["media_role"]
          step_id?: string | null
          storage_path?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creation_media_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creation_media_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      creation_prompts: {
        Row: {
          creation_id: string
          note: string | null
          position: number
          prompt_id: string
          step_id: string | null
        }
        Insert: {
          creation_id: string
          note?: string | null
          position?: number
          prompt_id: string
          step_id?: string | null
        }
        Update: {
          creation_id?: string
          note?: string | null
          position?: number
          prompt_id?: string
          step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creation_prompts_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creation_prompts_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creation_prompts_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "process_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      creation_resources: {
        Row: {
          creation_id: string
          note: string | null
          position: number
          resource_id: string
        }
        Insert: {
          creation_id: string
          note?: string | null
          position?: number
          resource_id: string
        }
        Update: {
          creation_id?: string
          note?: string | null
          position?: number
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creation_resources_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creation_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      creation_tags: {
        Row: {
          creation_id: string
          source: Database["public"]["Enums"]["content_source"]
          tag_id: number
        }
        Insert: {
          creation_id: string
          source?: Database["public"]["Enums"]["content_source"]
          tag_id: number
        }
        Update: {
          creation_id?: string
          source?: Database["public"]["Enums"]["content_source"]
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "creation_tags_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creation_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      creation_tools: {
        Row: {
          creation_id: string
          position: number
          role: string
          source: Database["public"]["Enums"]["content_source"]
          tool_id: number
          version: string | null
        }
        Insert: {
          creation_id: string
          position?: number
          role?: string
          source?: Database["public"]["Enums"]["content_source"]
          tool_id: number
          version?: string | null
        }
        Update: {
          creation_id?: string
          position?: number
          role?: string
          source?: Database["public"]["Enums"]["content_source"]
          tool_id?: number
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creation_tools_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creation_tools_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      creations: {
        Row: {
          ai_metadata: Json
          attributes: Json
          category_id: number | null
          comment_count: number
          cover_media_id: string | null
          created_at: string
          creator_id: string
          deleted_at: string | null
          description: string | null
          id: string
          like_count: number
          live_url: string | null
          published_at: string | null
          repo_url: string | null
          save_count: number
          search: unknown
          share_count: number
          slug: string
          status: Database["public"]["Enums"]["creation_status"]
          summary: string | null
          title: string
          trending_score: number
          updated_at: string
          view_count: number
        }
        Insert: {
          ai_metadata?: Json
          attributes?: Json
          category_id?: number | null
          comment_count?: number
          cover_media_id?: string | null
          created_at?: string
          creator_id: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          like_count?: number
          live_url?: string | null
          published_at?: string | null
          repo_url?: string | null
          save_count?: number
          search?: unknown
          share_count?: number
          slug: string
          status?: Database["public"]["Enums"]["creation_status"]
          summary?: string | null
          title: string
          trending_score?: number
          updated_at?: string
          view_count?: number
        }
        Update: {
          ai_metadata?: Json
          attributes?: Json
          category_id?: number | null
          comment_count?: number
          cover_media_id?: string | null
          created_at?: string
          creator_id?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          like_count?: number
          live_url?: string | null
          published_at?: string | null
          repo_url?: string | null
          save_count?: number
          search?: unknown
          share_count?: number
          slug?: string
          status?: Database["public"]["Enums"]["creation_status"]
          summary?: string | null
          title?: string
          trending_score?: number
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "creations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creations_cover_fk"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "creation_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          target_id: string
          target_type: Database["public"]["Enums"]["engagement_target"]
          user_id: string
        }
        Insert: {
          created_at?: string
          target_id: string
          target_type: Database["public"]["Enums"]["engagement_target"]
          user_id: string
        }
        Update: {
          created_at?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["engagement_target"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      process_steps: {
        Row: {
          body: string | null
          created_at: string
          creation_id: string
          id: string
          position: number
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          creation_id: string
          id?: string
          position: number
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          creation_id?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_steps_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          headline: string | null
          id: string
          is_admin: boolean
          onboarded_at: string | null
          social_links: Json
          updated_at: string
          username: string
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          headline?: string | null
          id: string
          is_admin?: boolean
          onboarded_at?: string | null
          social_links?: Json
          updated_at?: string
          username: string
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          headline?: string | null
          id?: string
          is_admin?: boolean
          onboarded_at?: string | null
          social_links?: Json
          updated_at?: string
          username?: string
          website_url?: string | null
        }
        Relationships: []
      }
      prompts: {
        Row: {
          author_id: string
          body: string
          copy_count: number
          created_at: string
          deleted_at: string | null
          fork_of_id: string | null
          id: string
          is_public: boolean
          kind: Database["public"]["Enums"]["prompt_kind"]
          like_count: number
          model_tool_id: number | null
          save_count: number
          search: unknown
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          copy_count?: number
          created_at?: string
          deleted_at?: string | null
          fork_of_id?: string | null
          id?: string
          is_public?: boolean
          kind?: Database["public"]["Enums"]["prompt_kind"]
          like_count?: number
          model_tool_id?: number | null
          save_count?: number
          search?: unknown
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          copy_count?: number
          created_at?: string
          deleted_at?: string | null
          fork_of_id?: string | null
          id?: string
          is_public?: boolean
          kind?: Database["public"]["Enums"]["prompt_kind"]
          like_count?: number
          model_tool_id?: number | null
          save_count?: number
          search?: unknown
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompts_fork_of_id_fkey"
            columns: ["fork_of_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompts_model_tool_id_fkey"
            columns: ["model_tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          author_id: string
          body: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_public: boolean
          kind: Database["public"]["Enums"]["resource_kind"]
          like_count: number
          save_count: number
          search: unknown
          storage_path: string | null
          title: string
          tool_id: number | null
          updated_at: string
          url: string | null
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          kind?: Database["public"]["Enums"]["resource_kind"]
          like_count?: number
          save_count?: number
          search?: unknown
          storage_path?: string | null
          title: string
          tool_id?: number | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          kind?: Database["public"]["Enums"]["resource_kind"]
          like_count?: number
          save_count?: number
          search?: unknown
          storage_path?: string | null
          title?: string
          tool_id?: number | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string
          target_id: string
          target_type: Database["public"]["Enums"]["engagement_target"]
          user_id: string
        }
        Insert: {
          created_at?: string
          target_id: string
          target_type: Database["public"]["Enums"]["engagement_target"]
          user_id: string
        }
        Update: {
          created_at?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["engagement_target"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      share_events: {
        Row: {
          channel: string
          created_at: string
          creation_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          creation_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          creation_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_events_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          id: number
          name: string
          slug: string
        }
        Insert: {
          id?: never
          name: string
          slug: string
        }
        Update: {
          id?: never
          name?: string
          slug?: string
        }
        Relationships: []
      }
      tool_relations: {
        Row: {
          related_tool_id: number
          relation: string
          tool_id: number
        }
        Insert: {
          related_tool_id: number
          relation?: string
          tool_id: number
        }
        Update: {
          related_tool_id?: number
          relation?: string
          tool_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tool_relations_related_tool_id_fkey"
            columns: ["related_tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_relations_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          is_verified: boolean
          kind: Database["public"]["Enums"]["tool_kind"]
          logo_url: string | null
          name: string
          parent_id: number | null
          slug: string
          vendor: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: never
          is_verified?: boolean
          kind?: Database["public"]["Enums"]["tool_kind"]
          logo_url?: string | null
          name: string
          parent_id?: number | null
          slug: string
          vendor?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: never
          is_verified?: boolean
          kind?: Database["public"]["Enums"]["tool_kind"]
          logo_url?: string | null
          name?: string
          parent_id?: number | null
          slug?: string
          vendor?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tools_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_creation: { Args: { cid: string }; Returns: boolean }
      category_counts: {
        Args: never
        Returns: {
          creation_count: number
          name: string
          parent_slug: string
          slug: string
        }[]
      }
      discover_cards: {
        Args: {
          p_category?: string
          p_creator_username?: string
          p_limit?: number
          p_offset?: number
          p_sort?: string
          p_tool_slugs?: string[]
          q?: string
        }
        Returns: {
          category_name: string
          category_slug: string
          comment_count: number
          cover_alt: string
          cover_height: number
          cover_storage_path: string
          cover_width: number
          creator_avatar_url: string
          creator_display_name: string
          creator_username: string
          id: string
          like_count: number
          published_at: string
          slug: string
          summary: string
          title: string
          tool_count: number
          tools: Json
          view_count: number
        }[]
      }
      increment_prompt_copy: {
        Args: { p_prompt_id: string }
        Returns: undefined
      }
      increment_view: { Args: { p_creation_id: string }; Returns: undefined }
      owns_creation: { Args: { cid: string }; Returns: boolean }
      popular_tools: {
        Args: { p_limit?: number }
        Returns: {
          creation_count: number
          kind: string
          name: string
          slug: string
        }[]
      }
      record_share: {
        Args: { p_channel: string; p_creation_id: string }
        Returns: undefined
      }
      refresh_trending: { Args: never; Returns: undefined }
      related_creations: {
        Args: { p_creation_id: string; p_limit?: number }
        Returns: {
          category_name: string
          category_slug: string
          comment_count: number
          cover_alt: string
          cover_height: number
          cover_storage_path: string
          cover_width: number
          creator_avatar_url: string
          creator_display_name: string
          creator_username: string
          id: string
          like_count: number
          published_at: string
          slug: string
          summary: string
          title: string
          tool_count: number
          tools: Json
          view_count: number
        }[]
      }
      save_creation: { Args: { payload: Json }; Returns: Json }
      saved_cards: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          category_name: string
          category_slug: string
          comment_count: number
          cover_alt: string
          cover_height: number
          cover_storage_path: string
          cover_width: number
          creator_avatar_url: string
          creator_display_name: string
          creator_username: string
          id: string
          like_count: number
          published_at: string
          slug: string
          summary: string
          title: string
          tool_count: number
          tools: Json
          view_count: number
        }[]
      }
      search_creations: {
        Args: {
          p_category?: string
          p_limit?: number
          p_offset?: number
          p_sort?: string
          p_tool_slugs?: string[]
          q?: string
        }
        Returns: {
          ai_metadata: Json
          attributes: Json
          category_id: number | null
          comment_count: number
          cover_media_id: string | null
          created_at: string
          creator_id: string
          deleted_at: string | null
          description: string | null
          id: string
          like_count: number
          live_url: string | null
          published_at: string | null
          repo_url: string | null
          save_count: number
          search: unknown
          share_count: number
          slug: string
          status: Database["public"]["Enums"]["creation_status"]
          summary: string | null
          title: string
          trending_score: number
          updated_at: string
          view_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "creations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_prompts: {
        Args: { p_limit?: number; q?: string }
        Returns: {
          author_id: string
          body: string
          copy_count: number
          created_at: string
          deleted_at: string | null
          fork_of_id: string | null
          id: string
          is_public: boolean
          kind: Database["public"]["Enums"]["prompt_kind"]
          like_count: number
          model_tool_id: number | null
          save_count: number
          search: unknown
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "prompts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_resources: {
        Args: {
          p_kind?: Database["public"]["Enums"]["resource_kind"]
          p_limit?: number
          q?: string
        }
        Returns: {
          author_id: string
          body: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_public: boolean
          kind: Database["public"]["Enums"]["resource_kind"]
          like_count: number
          save_count: number
          search: unknown
          storage_path: string | null
          title: string
          tool_id: number | null
          updated_at: string
          url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "resources"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      ai_job_kind:
        | "metadata_extraction"
        | "tagging"
        | "embedding"
        | "similar_creations"
      ai_job_status: "queued" | "running" | "succeeded" | "failed" | "cancelled"
      content_source: "user" | "ai_suggested" | "ai_confirmed"
      creation_status: "draft" | "published" | "archived"
      engagement_target: "creation" | "prompt" | "resource"
      media_kind: "image" | "video" | "audio" | "file" | "embed"
      media_role: "gallery" | "thumbnail" | "before" | "after"
      prompt_kind:
        | "text"
        | "system"
        | "image"
        | "video"
        | "audio"
        | "agent"
        | "other"
      report_status: "open" | "reviewing" | "actioned" | "dismissed"
      resource_kind:
        | "skill"
        | "template"
        | "ui_kit"
        | "workflow"
        | "agent"
        | "mcp_server"
        | "reference"
        | "tutorial"
        | "dataset"
        | "asset"
        | "other"
      tool_kind:
        | "ai_model"
        | "ai_app"
        | "framework"
        | "library"
        | "platform"
        | "design"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_job_kind: [
        "metadata_extraction",
        "tagging",
        "embedding",
        "similar_creations",
      ],
      ai_job_status: ["queued", "running", "succeeded", "failed", "cancelled"],
      content_source: ["user", "ai_suggested", "ai_confirmed"],
      creation_status: ["draft", "published", "archived"],
      engagement_target: ["creation", "prompt", "resource"],
      media_kind: ["image", "video", "audio", "file", "embed"],
      media_role: ["gallery", "thumbnail", "before", "after"],
      prompt_kind: [
        "text",
        "system",
        "image",
        "video",
        "audio",
        "agent",
        "other",
      ],
      report_status: ["open", "reviewing", "actioned", "dismissed"],
      resource_kind: [
        "skill",
        "template",
        "ui_kit",
        "workflow",
        "agent",
        "mcp_server",
        "reference",
        "tutorial",
        "dataset",
        "asset",
        "other",
      ],
      tool_kind: [
        "ai_model",
        "ai_app",
        "framework",
        "library",
        "platform",
        "design",
        "other",
      ],
    },
  },
} as const
