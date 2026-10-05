import { describe, expect, it } from 'vitest';
import {
  setLikeSchema,
  setSaveSchema,
  copyPromptSchema,
  savedCardsQuerySchema,
} from '@/lib/validation/engagement';

describe('engagement validation', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  describe('setLikeSchema', () => {
    it('validates creation target with liked boolean', () => {
      const res = setLikeSchema.safeParse({
        targetType: 'creation',
        targetId: validUuid,
        liked: true,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.liked).toBe(true);
      }
    });

    it('validates unlike operation (liked = false)', () => {
      const res = setLikeSchema.safeParse({
        targetType: 'creation',
        targetId: validUuid,
        liked: false,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.liked).toBe(false);
      }
    });

    it('rejects invalid target types', () => {
      const res = setLikeSchema.safeParse({
        targetType: 'invalid_type',
        targetId: validUuid,
        liked: true,
      });
      expect(res.success).toBe(false);
    });

    it('rejects non-uuid targetId', () => {
      const res = setLikeSchema.safeParse({
        targetType: 'creation',
        targetId: 'not-a-uuid',
        liked: true,
      });
      expect(res.success).toBe(false);
    });
  });

  describe('setSaveSchema', () => {
    it('validates save and unsave', () => {
      const saveRes = setSaveSchema.safeParse({
        targetType: 'creation',
        targetId: validUuid,
        saved: true,
      });
      expect(saveRes.success).toBe(true);

      const unsaveRes = setSaveSchema.safeParse({
        targetType: 'creation',
        targetId: validUuid,
        saved: false,
      });
      expect(unsaveRes.success).toBe(true);
    });
  });

  describe('copyPromptSchema', () => {
    it('validates prompt uuid', () => {
      const res = copyPromptSchema.safeParse({ promptId: validUuid });
      expect(res.success).toBe(true);
    });

    it('rejects invalid prompt id', () => {
      const res = copyPromptSchema.safeParse({ promptId: 'bad' });
      expect(res.success).toBe(false);
    });
  });

  describe('savedCardsQuerySchema', () => {
    it('applies default limit and offset', () => {
      const res = savedCardsQuerySchema.safeParse({});
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.limit).toBe(24);
        expect(res.data.offset).toBe(0);
      }
    });

    it('enforces limit boundary constraints', () => {
      // Valid limit
      const valid = savedCardsQuerySchema.safeParse({ limit: 60, offset: 12 });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.limit).toBe(60);
        expect(valid.data.offset).toBe(12);
      }

      // Rejects limit exceeding 60
      const invalidOver = savedCardsQuerySchema.safeParse({ limit: 100, offset: 12 });
      expect(invalidOver.success).toBe(false);

      // Rejects limit less than 1
      const invalidUnder = savedCardsQuerySchema.safeParse({ limit: 0, offset: 12 });
      expect(invalidUnder.success).toBe(false);
    });
  });
});
