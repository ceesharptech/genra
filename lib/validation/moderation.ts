import { z } from 'zod';
import { uuidSchema } from './common';

export const reportTargetTypeSchema = z.enum([
  'creation',
  'prompt',
  'resource',
  'collection',
  'profile',
]);

export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;

export const reportReasonSchema = z.enum([
  'spam',
  'harmful_or_illegal',
  'copyright',
  'personal_information',
  'sexual_content',
  'misleading',
  'other',
]);

export type ReportReason = z.infer<typeof reportReasonSchema>;

export const reportReasonLabels: Record<ReportReason, string> = {
  spam: 'Spam or commercial self-promotion',
  harmful_or_illegal: 'Harmful, abusive or illegal content',
  copyright: 'Copyright or intellectual property infringement',
  personal_information: 'Personal information or doxxing',
  sexual_content: 'Sexually explicit or inappropriate content',
  misleading: 'Misleading, deceptive or impersonation',
  other: 'Other policy violation',
};

export const createReportSchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: uuidSchema,
  reason: reportReasonSchema,
  details: z
    .string()
    .trim()
    .max(1000, 'Details cannot exceed 1,000 characters')
    .optional()
    .or(z.literal('')),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

export const adminResolveReportSchema = z.object({
  reportId: uuidSchema,
  action: z.enum(['hide', 'dismiss', 'clear_profile']),
  note: z
    .string()
    .trim()
    .max(1000, 'Note cannot exceed 1,000 characters')
    .optional(),
});

export type AdminResolveReportInput = z.infer<typeof adminResolveReportSchema>;

export const adminRestoreItemSchema = z.object({
  targetType: z.enum(['creation', 'prompt', 'resource', 'collection']),
  targetId: uuidSchema,
  note: z
    .string()
    .trim()
    .max(1000, 'Note cannot exceed 1,000 characters')
    .optional(),
});

export type AdminRestoreItemInput = z.infer<typeof adminRestoreItemSchema>;

export const toolKindSchema = z.enum([
  'ai_model',
  'ai_app',
  'framework',
  'library',
  'platform',
  'design',
  'other',
]);

export type ToolKind = z.infer<typeof toolKindSchema>;

export const toolKindLabels: Record<ToolKind, string> = {
  ai_model: 'AI Model',
  ai_app: 'AI App',
  framework: 'Framework',
  library: 'Library',
  platform: 'Platform',
  design: 'Design',
  other: 'Other',
};

export const adminUpdateToolSchema = z.object({
  toolId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, 'Name is required').max(100),
  kind: toolKindSchema,
  vendor: z.string().trim().max(100).optional().nullable(),
  websiteUrl: z.string().trim().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  logoUrl: z.string().trim().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  parentId: z.coerce.number().int().positive().optional().nullable(),
});

export type AdminUpdateToolInput = z.infer<typeof adminUpdateToolSchema>;

export const adminMergeToolsSchema = z.object({
  fromId: z.coerce.number().int().positive(),
  intoId: z.coerce.number().int().positive(),
});

export type AdminMergeToolsInput = z.infer<typeof adminMergeToolsSchema>;
