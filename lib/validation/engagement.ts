import { z } from 'zod';
import { uuidSchema } from './common';

export const engagementTargetTypeSchema = z.enum([
  'creation',
  'prompt',
  'resource',
]);

export type EngagementTargetType = z.infer<typeof engagementTargetTypeSchema>;

export const setLikeSchema = z.object({
  targetType: engagementTargetTypeSchema,
  targetId: uuidSchema,
  liked: z.boolean(),
});

export type SetLikeInput = z.infer<typeof setLikeSchema>;

export const setSaveSchema = z.object({
  targetType: engagementTargetTypeSchema,
  targetId: uuidSchema,
  saved: z.boolean(),
});

export type SetSaveInput = z.infer<typeof setSaveSchema>;

export const copyPromptSchema = z.object({
  promptId: uuidSchema,
});

export type CopyPromptInput = z.infer<typeof copyPromptSchema>;

export const savedCardsQuerySchema = z.object({
  limit: z.number().int().min(1).max(60).default(24),
  offset: z.number().int().min(0).default(0),
});

export type SavedCardsQueryInput = z.infer<typeof savedCardsQuerySchema>;

export const shareChannelSchema = z.enum([
  'copy_link',
  'native',
  'x',
  'linkedin',
  'whatsapp',
  'facebook',
  'reddit',
  'email',
]);

export type ShareChannel = z.infer<typeof shareChannelSchema>;

export const recordShareSchema = z.object({
  creationId: uuidSchema,
  channel: shareChannelSchema,
});

export type RecordShareInput = z.infer<typeof recordShareSchema>;
