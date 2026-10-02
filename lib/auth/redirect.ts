/**
 * Validates and sanitizes redirect paths to prevent open redirect vulnerabilities.
 * Only same-site relative paths starting with a single '/' are accepted.
 */
export function safeRedirectPath(
  input: string | null | undefined,
  fallback = "/"
): string {
  if (!input || typeof input !== "string") {
    return fallback;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return fallback;
  }

  // Reject control characters
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return fallback;
  }

  // Reject backslashes in all forms (raw or url-encoded %5c)
  if (trimmed.includes("\\") || /%5c/i.test(trimmed)) {
    return fallback;
  }

  // Must start with exactly one forward slash, never protocol-relative (//)
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  // Reject encoded protocol-relative slashes like /%2f
  if (/^\/%2f/i.test(trimmed)) {
    return fallback;
  }

  // Reject dangerous schemes masquerading as paths (e.g. /javascript:, /data:)
  if (/^\/(javascript|data|vbscript):/i.test(trimmed)) {
    return fallback;
  }

  try {
    // Resolve against a dummy base
    const parsed = new URL(trimmed, "http://localhost");

    // Origin must remain localhost (no external host escape)
    if (parsed.origin !== "http://localhost") {
      return fallback;
    }

    // Pathname must still be a standard relative path
    if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
      return fallback;
    }

    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}
