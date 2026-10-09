import { describe, expect, it } from 'vitest';
import { safeJsonLdReplacer } from '@/lib/seo/json-ld';

describe('JSON-LD safe serializer', () => {
  it('escapes script tags to prevent HTML script breakout', () => {
    const hostileObject = {
      title: '</script><script>alert(1)</script>',
      description: '"><img src=x onerror=alert(1)>',
    };

    const serialized = safeJsonLdReplacer(hostileObject);

    // Must NOT contain literal '<' or '>'
    expect(serialized).not.toContain('<script>');
    expect(serialized).not.toContain('</script>');
    expect(serialized).not.toContain('<img');
    expect(serialized).toContain('\\u003c/script\\u003e');
    expect(serialized).toContain('\\u003cscript\\u003e');
  });

  it('escapes U+2028 and U+2029 line/paragraph terminators', () => {
    const textWithTerminators = {
      lineBreak: 'Line 1\u2028Line 2\u2029Paragraph 2',
    };

    const serialized = safeJsonLdReplacer(textWithTerminators);

    expect(serialized).not.toContain('\u2028');
    expect(serialized).not.toContain('\u2029');
    expect(serialized).toContain('\\u2028');
    expect(serialized).toContain('\\u2029');
  });

  it('preserves valid JSON structure that parses back identically', () => {
    const normal = {
      name: 'ChowBuddy',
      description: 'An AI nutrition assistant',
      tags: ['ai', 'health'],
    };

    const serialized = safeJsonLdReplacer(normal);
    const parsed = JSON.parse(serialized);

    expect(parsed).toEqual(normal);
  });
});
