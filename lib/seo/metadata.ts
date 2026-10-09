/**
 * SEO and Social Metadata Helpers
 */

/**
 * Strips markdown and HTML formatting, collapses whitespace,
 * and truncates on a word boundary with an ellipsis.
 */
export function plainTextFromMarkdown(
  md: string | null | undefined,
  maxLength: number = 160
): string {
  if (!md || typeof md !== 'string') {
    return '';
  }

  const text = md
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove image syntax ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
    // Replace link syntax [text](url) with text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Remove HTML tags
    .replace(/<[^>]*>/g, ' ')
    // Remove headers (# Header)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove blockquotes (> quote)
    .replace(/^>\s+/gm, '')
    // Remove bold and italic formatting (**, __, *, _)
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove strikethrough (~~text~~)
    .replace(/~~(.*?)~~/g, '$1')
    // Remove list markers (- item, * item, 1. item)
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, ' ')
    // Collapse whitespace and newlines
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  // Truncate at word boundary
  const sub = text.slice(0, maxLength);
  const lastSpace = sub.lastIndexOf(' ');
  if (lastSpace > 0 && lastSpace >= maxLength * 0.7) {
    return `${sub.slice(0, lastSpace)}…`;
  }
  return `${sub}…`;
}

/**
 * Truncates a title cleanly at a word boundary if it exceeds maxLength.
 */
export function truncateTitle(
  title: string | null | undefined,
  maxLength: number = 70
): string {
  if (!title) return '';
  const trimmed = title.trim();
  if (trimmed.length <= maxLength) return trimmed;

  const sub = trimmed.slice(0, maxLength);
  const lastSpace = sub.lastIndexOf(' ');
  if (lastSpace > 0 && lastSpace >= maxLength * 0.7) {
    return `${sub.slice(0, lastSpace)}…`;
  }
  return `${sub}…`;
}

export interface CreationMetadataInput {
  title: string;
  summary?: string | null;
  description?: string | null;
  creatorName?: string | null;
  tools?: Array<{ name: string }> | string[] | null;
}

/**
 * Builds a clean, compelling description for a creation:
 * 1. Uses summary if present
 * 2. Else extracts plain text from description
 * 3. Else generates a descriptive fallback
 */
export function buildCreationDescription(
  creation: CreationMetadataInput,
  maxLength: number = 160
): string {
  if (creation.summary && creation.summary.trim().length > 0) {
    const text = creation.summary.trim().replace(/\s+/g, ' ');
    if (text.length <= maxLength) return text;
    const sub = text.slice(0, maxLength);
    const lastSpace = sub.lastIndexOf(' ');
    return lastSpace > 0 ? `${sub.slice(0, lastSpace)}…` : `${sub}…`;
  }

  if (creation.description && creation.description.trim().length > 0) {
    const fromDesc = plainTextFromMarkdown(creation.description, maxLength);
    if (fromDesc.length > 0) return fromDesc;
  }

  // Fallback description
  const creator = creation.creatorName || 'a creator';
  let toolsText = '';
  if (creation.tools && creation.tools.length > 0) {
    const toolNames = creation.tools.map((t) => (typeof t === 'string' ? t : t.name));
    if (toolNames.length === 1) {
      toolsText = toolNames[0];
    } else if (toolNames.length === 2) {
      toolsText = `${toolNames[0]} and ${toolNames[1]}`;
    } else {
      toolsText = `${toolNames.slice(0, 2).join(', ')} and more`;
    }
  }

  if (toolsText) {
    return `A creation by ${creator} on Genra, made with ${toolsText}. Explore the tools, prompts, and process.`;
  }
  return `A creation by ${creator} on Genra. Explore how it was built with AI tools and prompts.`;
}
