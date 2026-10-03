import { z } from 'zod'
import { uuidSchema } from './common'

export const mediaKindEnum = z.enum(['image', 'video', 'audio', 'file', 'embed'])
export const mediaRoleEnum = z.enum(['gallery', 'thumbnail', 'before', 'after'])
export const toolRoleEnum = z.enum(['primary', 'supporting'])

export const promptKindEnum = z.enum([
  'text',
  'system',
  'image',
  'video',
  'audio',
  'agent',
  'other',
])

export const resourceKindEnum = z.enum([
  'skill',
  'template',
  'ui_kit',
  'workflow',
  'agent',
  'mcp_server',
  'reference',
  'tutorial',
  'dataset',
  'asset',
  'other',
])

export const toolKindEnum = z.enum([
  'ai_model',
  'ai_app',
  'framework',
  'library',
  'platform',
  'design',
  'other',
])

// -----------------------------------------------------------------------------
// Sub-item schemas
// -----------------------------------------------------------------------------

export const creationToolItemSchema = z.object({
  tool_id: z.number().int().positive(),
  role: toolRoleEnum.default('supporting'),
  version: z.string().trim().max(30).nullable().optional(),
  position: z.number().int().min(0).default(0),
})

export const creationStepItemSchema = z.object({
  id: uuidSchema,
  position: z.number().int().min(0).default(0),
  title: z.string().trim().max(140).default(''),
  body: z.string().max(10000).nullable().optional(),
})

export const creationMediaItemSchema = z.object({
  id: uuidSchema,
  kind: mediaKindEnum.default('image'),
  role: mediaRoleEnum.default('gallery'),
  storage_path: z.string().nullable().optional(),
  external_url: z.string().nullable().optional(),
  mime_type: z.string().max(100).nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  duration_ms: z.number().int().positive().nullable().optional(),
  alt_text: z.string().trim().max(250).nullable().optional(),
  caption: z.string().trim().max(500).nullable().optional(),
  position: z.number().int().min(0).default(0),
  step_id: uuidSchema.nullable().optional(),
})

export const creationPromptItemSchema = z.object({
  prompt_id: uuidSchema,
  step_id: uuidSchema.nullable().optional(),
  position: z.number().int().min(0).default(0),
  note: z.string().trim().max(300).nullable().optional(),
})

export const creationResourceItemSchema = z.object({
  resource_id: uuidSchema,
  position: z.number().int().min(0).default(0),
  note: z.string().trim().max(300).nullable().optional(),
})

// Optional URL field: allows empty string or valid http(s) URL
const optionalUrlSchema = z
  .string()
  .trim()
  .refine(
    (val) => val === '' || /^https?:\/\/.+/.test(val),
    'Must be a valid http:// or https:// URL'
  )
  .nullable()
  .optional()

// -----------------------------------------------------------------------------
// Core Creation Form Schema (Draft / In-progress)
// -----------------------------------------------------------------------------

export const creationFormSchema = z.object({
  id: uuidSchema,
  title: z.string().trim().max(140).default(''),
  summary: z.string().trim().max(280).nullable().optional(),
  description: z.string().max(10000).nullable().optional(),
  category_id: z.number().int().positive().nullable().optional(),
  live_url: optionalUrlSchema,
  repo_url: optionalUrlSchema,
  cover_media_id: uuidSchema.nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).default({}),
  tools: z.array(creationToolItemSchema).max(10, 'At most 10 tools allowed').default([]),
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(8, 'At most 8 tags allowed')
    .default([]),
  steps: z
    .array(creationStepItemSchema)
    .max(20, 'At most 20 steps allowed')
    .default([]),
  media: z
    .array(creationMediaItemSchema)
    .max(12, 'At most 12 media items allowed')
    .default([]),
  prompts: z
    .array(creationPromptItemSchema)
    .max(10, 'At most 10 prompts allowed')
    .default([]),
  resources: z
    .array(creationResourceItemSchema)
    .max(15, 'At most 15 resources allowed')
    .default([]),
})

export type CreationFormValues = z.infer<typeof creationFormSchema>

// -----------------------------------------------------------------------------
// Strict Publish Schema (Enforces required fields to transition to 'published')
// -----------------------------------------------------------------------------

export const publishCreationSchema = creationFormSchema
  .refine(
    (data) => data.title.trim().length >= 3 && data.title.trim() !== 'Untitled creation',
    {
      message: 'Title must be at least 3 characters',
      path: ['title'],
    }
  )
  .refine((data) => typeof data.category_id === 'number' && data.category_id > 0, {
    message: 'Please select a category',
    path: ['category_id'],
  })
  .refine((data) => data.tools.length >= 1, {
    message: 'At least one tool is required to publish',
    path: ['tools'],
  })
  .refine(
    (data) => {
      const primaryCount = data.tools.filter((t) => t.role === 'primary').length
      return primaryCount <= 1
    },
    {
      message: 'At most one tool can be marked as primary',
      path: ['tools'],
    }
  )
  .refine(
    (data) => {
      if (!data.cover_media_id) return false
      const coverMedia = data.media.find((m) => m.id === data.cover_media_id)
      return (
        !!coverMedia &&
        coverMedia.kind === 'image' &&
        !!coverMedia.storage_path
      )
    },
    {
      message: 'A valid cover image is required to publish',
      path: ['cover_media_id'],
    }
  )

// -----------------------------------------------------------------------------
// Payload Schema sent to `save_creation(payload jsonb)` RPC
// -----------------------------------------------------------------------------

export const saveCreationPayloadSchema = z.object({
  action: z.enum(['save', 'publish']),
  creation: z.object({
    id: uuidSchema,
    title: z.string().trim().max(140),
    summary: z.string().trim().max(280).nullable().optional(),
    description: z.string().max(10000).nullable().optional(),
    category_id: z.number().int().positive().nullable().optional(),
    live_url: optionalUrlSchema,
    repo_url: optionalUrlSchema,
    cover_media_id: uuidSchema.nullable().optional(),
    attributes: z.record(z.string(), z.unknown()).default({}),
  }),
  tools: z.array(creationToolItemSchema).max(10),
  tags: z.array(z.string().trim().min(1).max(40)).max(8),
  steps: z.array(creationStepItemSchema).max(20),
  media: z.array(creationMediaItemSchema).max(12),
  prompts: z.array(creationPromptItemSchema).max(10),
  resources: z.array(creationResourceItemSchema).max(15),
})

export type SaveCreationPayload = z.infer<typeof saveCreationPayloadSchema>

// -----------------------------------------------------------------------------
// Quick-Create Schemas (Used in dialogs inside the authoring flow)
// -----------------------------------------------------------------------------

export const quickCreatePromptSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(140),
  body: z.string().trim().min(3, 'Prompt body is required').max(10000),
  kind: promptKindEnum.default('text'),
  model_tool_id: z.number().int().positive().nullable().optional(),
  is_public: z.boolean().default(true),
})

export type QuickCreatePromptInput = z.infer<typeof quickCreatePromptSchema>

export const quickCreateResourceSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(140),
  kind: resourceKindEnum,
  url: optionalUrlSchema,
  description: z.string().trim().max(500).nullable().optional(),
  tool_id: z.number().int().positive().nullable().optional(),
  is_public: z.boolean().default(true),
})

export type QuickCreateResourceInput = z.infer<typeof quickCreateResourceSchema>

export const proposeToolSchema = z.object({
  name: z.string().trim().min(2, 'Tool name must be at least 2 characters').max(80),
  kind: toolKindEnum.default('ai_app'),
  website_url: optionalUrlSchema,
})

export type ProposeToolInput = z.infer<typeof proposeToolSchema>
