import { describe, expect, it } from 'vitest';
import {
  plainTextFromMarkdown,
  truncateTitle,
  buildCreationDescription,
} from '@/lib/seo/metadata';

describe('SEO metadata helpers', () => {
  describe('plainTextFromMarkdown', () => {
    it('strips markdown syntax and collapses whitespace', () => {
      const md = `
# Main Header

This is **bold** text and *italic* text. Here is a [link](https://example.com) and an image ![alt](https://example.com/pic.jpg).

> A wise quote

\`\`\`ts
const x = 1;
\`\`\`

- Bullet 1
- Bullet 2
`;
      const plain = plainTextFromMarkdown(md);
      expect(plain).not.toContain('#');
      expect(plain).not.toContain('**');
      expect(plain).not.toContain('*italic*');
      expect(plain).not.toContain('![alt]');
      expect(plain).toContain('Main Header');
      expect(plain).toContain('bold text and italic text. Here is a link');
      expect(plain).toContain('A wise quote');
      expect(plain).toContain('Bullet 1 Bullet 2');
    });

    it('strips HTML tags and hostile script injection attempts', () => {
      const malicious = '<script>alert("hacked")</script><b>Bold content</b> <div class="danger">Hello</div>';
      const plain = plainTextFromMarkdown(malicious);

      expect(plain).not.toContain('<script>');
      expect(plain).not.toContain('<b>');
      expect(plain).toContain('Bold content Hello');
    });

    it('truncates at a word boundary with an ellipsis', () => {
      const longText = 'The quick brown fox jumps over the lazy dog and runs across the wide open field.';
      const truncated = plainTextFromMarkdown(longText, 35);

      expect(truncated.endsWith('…')).toBe(true);
      expect(truncated.length).toBeLessThanOrEqual(36);
      // Word "lazy" should not be cut in the middle (e.g., "laz…")
      expect(truncated).not.toContain('laz…');
      expect(truncated).toBe('The quick brown fox jumps over the…');
    });

    it('handles empty, null, and undefined values safely', () => {
      expect(plainTextFromMarkdown('')).toBe('');
      expect(plainTextFromMarkdown(null)).toBe('');
      expect(plainTextFromMarkdown(undefined)).toBe('');
    });
  });

  describe('truncateTitle', () => {
    it('leaves short titles untouched', () => {
      expect(truncateTitle('ChowBuddy App')).toBe('ChowBuddy App');
    });

    it('truncates long titles cleanly at a word boundary', () => {
      const longTitle = 'ChowBuddy: A Revolutionary Real-time Nutritional Analysis Platform Built with Next.js and Cursor';
      const truncated = truncateTitle(longTitle, 40);

      expect(truncated.endsWith('…')).toBe(true);
      expect(truncated.length).toBeLessThanOrEqual(41);
    });

    it('handles falsy input safely', () => {
      expect(truncateTitle('')).toBe('');
      expect(truncateTitle(null)).toBe('');
      expect(truncateTitle(undefined)).toBe('');
    });
  });

  describe('buildCreationDescription', () => {
    it('prefers creation summary when available', () => {
      const desc = buildCreationDescription({
        title: 'ChowBuddy',
        summary: 'A fast food logging app.',
        description: 'Detailed technical description here.',
        creatorName: 'Ada',
      });
      expect(desc).toBe('A fast food logging app.');
    });

    it('falls back to cleaned description when summary is missing', () => {
      const desc = buildCreationDescription({
        title: 'ChowBuddy',
        summary: '',
        description: '## About\nBuilt using **Claude** and Next.js for rapid prototyping.',
        creatorName: 'Ada',
      });
      expect(desc).toContain('About Built using Claude and Next.js');
    });

    it('generates a clean template fallback when both summary and description are missing', () => {
      const desc = buildCreationDescription({
        title: 'ChowBuddy',
        creatorName: 'Ada',
        tools: [{ name: 'Cursor' }, { name: 'Claude Code' }],
      });
      expect(desc).toBe('A creation by Ada on Genra, made with Cursor and Claude Code. Explore the tools, prompts, and process.');
    });
  });
});
