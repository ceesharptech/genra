import { describe, expect, it } from 'vitest';
import {
  buildPromptJsonLd,
  buildResourceJsonLd,
  buildToolJsonLd,
  buildCollectionJsonLd,
  safeJsonLdReplacer,
} from '@/lib/seo/json-ld';
import robots from '@/app/robots';

describe('Library & Collections JSON-LD Builders', () => {
  it('builds valid schema.org CreativeWork for prompts', () => {
    const prompt = {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'Next.js 15 Architect Prompt',
      body: 'Act as a principal architect...',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-02T00:00:00Z',
      author: {
        username: 'alice',
        display_name: 'Alice Wonder',
      },
      model_tool: {
        name: 'Claude 3.5 Sonnet',
      },
    };

    const jsonLd = buildPromptJsonLd(prompt);
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('CreativeWork');
    expect(jsonLd.name).toBe(prompt.title);
    expect(jsonLd.creator.name).toBe('Alice Wonder');
    expect(jsonLd.keywords).toBe('Claude 3.5 Sonnet');

    const serialized = safeJsonLdReplacer(jsonLd);
    expect(serialized).not.toContain('<');
    expect(serialized).not.toContain('>');
  });

  it('builds valid schema.org CreativeWork for resources', () => {
    const resource = {
      id: '00000000-0000-0000-0000-000000000002',
      title: 'Fullstack AI Kit',
      description: 'Production starter template',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-02T00:00:00Z',
      author: {
        username: 'bob',
        display_name: 'Bob Ross',
      },
      tool: {
        name: 'Next.js',
      },
    };

    const jsonLd = buildResourceJsonLd(resource);
    expect(jsonLd['@type']).toBe('CreativeWork');
    expect(jsonLd.name).toBe(resource.title);
    expect(jsonLd.description).toBe(resource.description);
  });

  it('builds valid schema.org SoftwareApplication for tools', () => {
    const tool = {
      name: 'v0 by Vercel',
      slug: 'v0',
      vendor: 'Vercel',
      website_url: 'https://v0.dev',
      logo_url: null,
      kind: 'ai_app',
    };

    const jsonLd = buildToolJsonLd(tool);
    expect(jsonLd['@type']).toBe('SoftwareApplication');
    expect(jsonLd.name).toBe(tool.name);
    expect(jsonLd.sameAs).toBe('https://v0.dev');
  });

  it('builds valid schema.org CollectionPage for collections', () => {
    const collection = {
      id: '00000000-0000-0000-0000-000000000003',
      title: 'Best Prompt Engineering Guides',
      description: 'Comprehensive guides from beginner to advanced',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-02T00:00:00Z',
      owner: {
        username: 'carol',
        display_name: 'Carol Danvers',
      },
      item_count: 5,
    };

    const jsonLd = buildCollectionJsonLd(collection);
    expect(jsonLd['@type']).toBe('CollectionPage');
    expect(jsonLd.name).toBe(collection.title);
    expect(jsonLd.numberOfItems).toBe(5);
  });
});

describe('Robots Configuration for Library & Collections', () => {
  it('allows public discovery, tool, and collection routes and disallows mutations', () => {
    const robotRules = robots();
    const rule = Array.isArray(robotRules.rules) ? robotRules.rules[0] : robotRules.rules;

    expect(rule).toBeDefined();
    const allowList = Array.isArray(rule?.allow) ? rule.allow : [rule?.allow];
    const disallowList = Array.isArray(rule?.disallow) ? rule.disallow : [rule?.disallow];

    expect(allowList).toContain('/prompts');
    expect(allowList).toContain('/resources');
    expect(allowList).toContain('/tools/');
    expect(allowList).toContain('/collections/');

    expect(disallowList).toContain('/prompts/new');
    expect(disallowList).toContain('/prompts/*/edit');
    expect(disallowList).toContain('/resources/new');
    expect(disallowList).toContain('/resources/*/edit');
  });
});
