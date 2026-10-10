import { z } from 'zod';
import { uuidSchema } from './common';
import { promptKindEnum, resourceKindEnum } from './creation';

export type PromptKind = z.infer<typeof promptKindEnum>;
export type ResourceKind = z.infer<typeof resourceKindEnum>;
export { promptKindEnum, resourceKindEnum };

// -----------------------------------------------------------------------------
// URL Filters & Queries
// -----------------------------------------------------------------------------

export const promptsSortSchema = z.enum(['popular', 'new']).default('popular');
export type PromptsSort = z.infer<typeof promptsSortSchema>;

export const promptsQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
  tool: z.string().trim().max(80).optional().default(''),
  sort: promptsSortSchema,
  page: z.coerce.number().int().min(1).default(1),
});
export type PromptsQuery = z.infer<typeof promptsQuerySchema>;

export const resourcesSortSchema = z.enum(['popular', 'new']).default('popular');
export type ResourcesSort = z.infer<typeof resourcesSortSchema>;

export const resourcesQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
  kind: resourceKindEnum.optional(),
  tool: z.string().trim().max(80).optional().default(''),
  sort: resourcesSortSchema,
  page: z.coerce.number().int().min(1).default(1),
});
export type ResourcesQuery = z.infer<typeof resourcesQuerySchema>;

export function buildPromptsUrl(query: Partial<PromptsQuery>): string {
  const params = new URLSearchParams();
  if (query.q && query.q.trim()) params.set('q', query.q.trim());
  if (query.tool && query.tool.trim()) params.set('tool', query.tool.trim());
  if (query.sort && query.sort !== 'popular') params.set('sort', query.sort);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  const qs = params.toString();
  return qs ? `/prompts?${qs}` : '/prompts';
}

export function buildResourcesUrl(query: Partial<ResourcesQuery>): string {
  const params = new URLSearchParams();
  if (query.q && query.q.trim()) params.set('q', query.q.trim());
  if (query.kind) params.set('kind', query.kind);
  if (query.tool && query.tool.trim()) params.set('tool', query.tool.trim());
  if (query.sort && query.sort !== 'popular') params.set('sort', query.sort);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  const qs = params.toString();
  return qs ? `/resources?${qs}` : '/resources';
}

// Profile tabs
export const profileTabSchema = z
  .enum(['creations', 'library', 'collections'])
  .default('creations');
export type ProfileTab = z.infer<typeof profileTabSchema>;

// Saved page tabs
export const savedTabSchema = z
  .enum(['creations', 'prompts', 'resources'])
  .default('creations');
export type SavedTab = z.infer<typeof savedTabSchema>;

// -----------------------------------------------------------------------------
// Standalone Prompt Schemas
// -----------------------------------------------------------------------------

export const createPromptSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(140, 'Title cannot exceed 140 characters'),
  body: z
    .string()
    .trim()
    .min(3, 'Prompt body is required')
    .max(20000, 'Prompt body cannot exceed 20,000 characters'),
  kind: promptKindEnum.default('text'),
  model_tool_id: z.number().int().positive().nullable().optional(),
  is_public: z.boolean().default(true),
});
export type CreatePromptInput = z.infer<typeof createPromptSchema>;

export const updatePromptSchema = createPromptSchema.extend({
  id: uuidSchema,
});
export type UpdatePromptInput = z.infer<typeof updatePromptSchema>;

export const forkPromptSchema = z.object({
  promptId: uuidSchema,
});
export type ForkPromptInput = z.infer<typeof forkPromptSchema>;

// -----------------------------------------------------------------------------
// Standalone Resource Schemas
// -----------------------------------------------------------------------------

const httpUrlRegex = /^https?:\/\/.+/i;

export const createResourceSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(140, 'Title cannot exceed 140 characters'),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .nullable()
      .optional(),
    kind: resourceKindEnum.default('other'),
    url: z
      .string()
      .trim()
      .regex(httpUrlRegex, 'URL must begin with http:// or https://')
      .nullable()
      .optional()
      .or(z.literal('')),
    body: z
      .string()
      .trim()
      .max(20000, 'Body markdown cannot exceed 20,000 characters')
      .nullable()
      .optional()
      .or(z.literal('')),
    tool_id: z.number().int().positive().nullable().optional(),
    is_public: z.boolean().default(true),
  })
  .refine(
    (data) => {
      const hasUrl = Boolean(data.url && data.url.trim().length > 0);
      const hasBody = Boolean(data.body && data.body.trim().length > 0);
      return hasUrl || hasBody;
    },
    {
      message: 'Please provide either an external link URL or a markdown guide/body (or both).',
      path: ['url'],
    }
  );
export type CreateResourceInput = z.infer<typeof createResourceSchema>;

export const updateResourceSchema = z
  .object({
    id: uuidSchema,
    title: z
      .string()
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(140, 'Title cannot exceed 140 characters'),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .nullable()
      .optional(),
    kind: resourceKindEnum.default('other'),
    url: z
      .string()
      .trim()
      .regex(httpUrlRegex, 'URL must begin with http:// or https://')
      .nullable()
      .optional()
      .or(z.literal('')),
    body: z
      .string()
      .trim()
      .max(20000, 'Body markdown cannot exceed 20,000 characters')
      .nullable()
      .optional()
      .or(z.literal('')),
    tool_id: z.number().int().positive().nullable().optional(),
    is_public: z.boolean().default(true),
  })
  .refine(
    (data) => {
      const hasUrl = Boolean(data.url && data.url.trim().length > 0);
      const hasBody = Boolean(data.body && data.body.trim().length > 0);
      return hasUrl || hasBody;
    },
    {
      message: 'Please provide either an external link URL or a markdown guide/body (or both).',
      path: ['url'],
    }
  );
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;

// -----------------------------------------------------------------------------
// Collection Schemas
// -----------------------------------------------------------------------------

export const createCollectionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(80, 'Title cannot exceed 80 characters'),
  description: z
    .string()
    .trim()
    .max(300, 'Description cannot exceed 300 characters')
    .nullable()
    .optional(),
  is_public: z.boolean().default(true),
});
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

export const updateCollectionSchema = createCollectionSchema.extend({
  id: uuidSchema,
});
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;

export const collectionItemTargetTypeSchema = z.enum(['creation', 'prompt', 'resource']);
export type CollectionItemTargetType = z.infer<typeof collectionItemTargetTypeSchema>;

export const addCollectionItemSchema = z.object({
  collectionId: uuidSchema,
  targetType: collectionItemTargetTypeSchema,
  targetId: uuidSchema,
  note: z.string().trim().max(300).nullable().optional(),
});
export type AddCollectionItemInput = z.infer<typeof addCollectionItemSchema>;

export const removeCollectionItemSchema = z.object({
  collectionId: uuidSchema,
  targetType: collectionItemTargetTypeSchema,
  targetId: uuidSchema,
});
export type RemoveCollectionItemInput = z.infer<typeof removeCollectionItemSchema>;

export const quickCreateCollectionAndAddSchema = createCollectionSchema.extend({
  targetType: collectionItemTargetTypeSchema,
  targetId: uuidSchema,
});
export type QuickCreateCollectionAndAddInput = z.infer<typeof quickCreateCollectionAndAddSchema>;
