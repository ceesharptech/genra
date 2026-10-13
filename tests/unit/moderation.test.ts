import { describe, it, expect } from 'vitest';
import {
  createReportSchema,
  adminResolveReportSchema,
  adminRestoreItemSchema,
  adminUpdateToolSchema,
  adminMergeToolsSchema,
  reportReasonLabels,
  toolKindLabels,
} from '@/lib/validation/moderation';

describe('Moderation Validation Schemas', () => {
  const validUuid = '12345678-1234-4234-8234-123456789abc';

  describe('createReportSchema', () => {
    it('accepts valid report inputs for all target types', () => {
      const targetTypes = ['creation', 'prompt', 'resource', 'collection', 'profile'] as const;

      for (const targetType of targetTypes) {
        const result = createReportSchema.safeParse({
          targetType,
          targetId: validUuid,
          reason: 'spam',
          details: 'Commercial spam promotion',
        });
        expect(result.success).toBe(true);
      }
    });

    it('accepts valid report without details or with empty string', () => {
      const result = createReportSchema.safeParse({
        targetType: 'creation',
        targetId: validUuid,
        reason: 'copyright',
        details: '',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid target type', () => {
      const result = createReportSchema.safeParse({
        targetType: 'invalid_type',
        targetId: validUuid,
        reason: 'spam',
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-uuid targetId', () => {
      const result = createReportSchema.safeParse({
        targetType: 'creation',
        targetId: 'not-a-uuid',
        reason: 'spam',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid report reason', () => {
      const result = createReportSchema.safeParse({
        targetType: 'creation',
        targetId: validUuid,
        reason: 'not_a_real_reason',
      });
      expect(result.success).toBe(false);
    });

    it('rejects details exceeding 1000 characters', () => {
      const result = createReportSchema.safeParse({
        targetType: 'creation',
        targetId: validUuid,
        reason: 'other',
        details: 'a'.repeat(1001),
      });
      expect(result.success).toBe(false);
    });

    it('has user-friendly labels for all defined reasons', () => {
      expect(Object.keys(reportReasonLabels).length).toBe(7);
      expect(reportReasonLabels.spam).toContain('Spam');
      expect(reportReasonLabels.copyright).toContain('Copyright');
    });
  });

  describe('adminResolveReportSchema', () => {
    it('accepts valid resolve actions: hide, dismiss, clear_profile', () => {
      for (const action of ['hide', 'dismiss', 'clear_profile'] as const) {
        const result = adminResolveReportSchema.safeParse({
          reportId: validUuid,
          action,
          note: 'Actioned per policy review',
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid action name', () => {
      const result = adminResolveReportSchema.safeParse({
        reportId: validUuid,
        action: 'ban_user',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('adminRestoreItemSchema', () => {
    it('accepts valid restore inputs', () => {
      const result = adminRestoreItemSchema.safeParse({
        targetType: 'creation',
        targetId: validUuid,
        note: 'Restored after successful creator appeal',
      });
      expect(result.success).toBe(true);
    });

    it('rejects unsupported restore target type', () => {
      const result = adminRestoreItemSchema.safeParse({
        targetType: 'profile',
        targetId: validUuid,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('adminUpdateToolSchema & adminMergeToolsSchema', () => {
    it('accepts valid tool updates with numeric bigint IDs', () => {
      const result = adminUpdateToolSchema.safeParse({
        toolId: 42,
        name: 'Midjourney v6',
        kind: 'ai_model',
        vendor: 'Midjourney',
        websiteUrl: 'https://midjourney.com',
        logoUrl: 'https://midjourney.com/logo.png',
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-positive toolId', () => {
      const result = adminUpdateToolSchema.safeParse({
        toolId: -1,
        name: 'Bad Tool',
        kind: 'ai_app',
      });
      expect(result.success).toBe(false);
    });

    it('validates toolKind labels map', () => {
      expect(toolKindLabels.ai_model).toBe('AI Model');
      expect(toolKindLabels.framework).toBe('Framework');
    });

    it('accepts valid merge tool payloads', () => {
      const result = adminMergeToolsSchema.safeParse({
        fromId: 10,
        intoId: 2,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fromId).toBe(10);
        expect(result.data.intoId).toBe(2);
      }
    });
  });
});
