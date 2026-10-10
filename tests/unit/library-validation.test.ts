import { describe, expect, it } from 'vitest';
import {
  promptsQuerySchema,
  resourcesQuerySchema,
  buildPromptsUrl,
  buildResourcesUrl,
  createPromptSchema,
  updatePromptSchema,
  createResourceSchema,
  updateResourceSchema,
  createCollectionSchema,
  addCollectionItemSchema,
  removeCollectionItemSchema,
} from '@/lib/validation/library';

describe('Library Query Validation & URL Builders', () => {
  it('parses empty prompt queries with sensible defaults', () => {
    const parsed = promptsQuerySchema.parse({});
    expect(parsed.q).toBe('');
    expect(parsed.tool).toBe('');
    expect(parsed.sort).toBe('popular');
    expect(parsed.page).toBe(1);
  });

  it('normalizes prompt query parameters', () => {
    const parsed = promptsQuerySchema.parse({
      q: '  midjourney cinematic  ',
      tool: ' midjourney ',
      sort: 'new',
      page: '3',
    });
    expect(parsed.q).toBe('midjourney cinematic');
    expect(parsed.tool).toBe('midjourney');
    expect(parsed.sort).toBe('new');
    expect(parsed.page).toBe(3);
  });

  it('builds clean prompt URLs without redundant defaults', () => {
    expect(buildPromptsUrl({})).toBe('/prompts');
    expect(buildPromptsUrl({ q: 'cursor', sort: 'popular' })).toBe('/prompts?q=cursor');
    expect(buildPromptsUrl({ tool: 'v0', sort: 'new', page: 2 })).toBe(
      '/prompts?tool=v0&sort=new&page=2'
    );
  });

  it('parses resource queries with kind filter', () => {
    const parsed = resourcesQuerySchema.parse({
      kind: 'ui_kit',
      sort: 'popular',
    });
    expect(parsed.kind).toBe('ui_kit');
    expect(parsed.sort).toBe('popular');
  });

  it('builds clean resource URLs', () => {
    expect(buildResourcesUrl({})).toBe('/resources');
    expect(buildResourcesUrl({ kind: 'template' })).toBe('/resources?kind=template');
    expect(buildResourcesUrl({ kind: 'tutorial', tool: 'nextjs', sort: 'new' })).toBe(
      '/resources?kind=tutorial&tool=nextjs&sort=new'
    );
  });
});

describe('Prompt Schemas', () => {
  it('accepts valid prompt creation input', () => {
    const result = createPromptSchema.safeParse({
      title: 'Expert Next.js Refactoring Assistant',
      body: 'You are an elite TypeScript and Next.js 15 engineer. Focus on RSC boundaries...',
      kind: 'system',
      model_tool_id: 1,
      is_public: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects titles that are too short or too long', () => {
    const tooShort = createPromptSchema.safeParse({
      title: 'A',
      body: 'Valid body text',
    });
    expect(tooShort.success).toBe(false);

    const tooLong = createPromptSchema.safeParse({
      title: 'A'.repeat(141),
      body: 'Valid body text',
    });
    expect(tooLong.success).toBe(false);
  });

  it('rejects empty or whitespace prompt body', () => {
    const emptyBody = createPromptSchema.safeParse({
      title: 'Valid title',
      body: '   ',
    });
    expect(emptyBody.success).toBe(false);
  });

  it('validates update prompt requires valid UUID', () => {
    const invalidId = updatePromptSchema.safeParse({
      id: 'not-a-uuid',
      title: 'Valid title',
      body: 'Valid body',
    });
    expect(invalidId.success).toBe(false);

    const validId = updatePromptSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Valid title',
      body: 'Valid body',
    });
    expect(validId.success).toBe(true);
  });
});

describe('Resource Schemas', () => {
  it('accepts resource with external URL only', () => {
    const result = createResourceSchema.safeParse({
      title: 'Awesome Cursor Rules Repository',
      kind: 'workflow',
      url: 'https://github.com/cursor-rules',
      is_public: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts resource with markdown guide only', () => {
    const result = createResourceSchema.safeParse({
      title: 'Local Supabase Migrations Cheatsheet',
      kind: 'tutorial',
      body: '# How to write migrations\n\n1. Use sequential numbering...',
      is_public: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects resource when neither URL nor Body is provided', () => {
    const result = createResourceSchema.safeParse({
      title: 'Empty Resource',
      kind: 'other',
      url: '',
      body: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('Please provide either an external link URL or a markdown guide');
    }
  });

  it('rejects invalid URL protocols (e.g. javascript: or ftp:)', () => {
    const result = createResourceSchema.safeParse({
      title: 'Malicious Link',
      kind: 'other',
      url: 'javascript:alert(1)',
    });
    expect(result.success).toBe(false);
  });

  it('validates update resource schema with id', () => {
    const valid = updateResourceSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Updated title',
      url: 'https://example.com',
    });
    expect(valid.success).toBe(true);

    const invalid = updateResourceSchema.safeParse({
      id: 'invalid-uuid',
      title: 'Updated title',
      url: 'https://example.com',
    });
    expect(invalid.success).toBe(false);
  });
});

describe('Collection Schemas', () => {
  it('validates collection creation', () => {
    const result = createCollectionSchema.safeParse({
      title: 'My Favorite Agent Workflows',
      description: 'Hand-picked agents and prompt chains.',
      is_public: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty collection title or over 80 characters', () => {
    const empty = createCollectionSchema.safeParse({ title: '' });
    expect(empty.success).toBe(false);

    const tooLong = createCollectionSchema.safeParse({ title: 'A'.repeat(81) });
    expect(tooLong.success).toBe(false);
  });

  it('validates collection item membership payloads', () => {
    const addResult = addCollectionItemSchema.safeParse({
      collectionId: '123e4567-e89b-12d3-a456-426614174000',
      targetType: 'creation',
      targetId: '123e4567-e89b-12d3-a456-426614174001',
      note: 'Use this for hero inspirations',
    });
    expect(addResult.success).toBe(true);

    const removeResult = removeCollectionItemSchema.safeParse({
      collectionId: '123e4567-e89b-12d3-a456-426614174000',
      targetType: 'prompt',
      targetId: '123e4567-e89b-12d3-a456-426614174002',
    });
    expect(removeResult.success).toBe(true);
  });
});
