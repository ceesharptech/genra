export interface ParsedIntent {
  action: string;
  targetType: string;
  targetId: string;
}

export type IntentHandler = (
  targetType: string,
  targetId: string
) => Promise<void> | void;

const intentRegistry = new Map<string, IntentHandler>();

/**
 * Registers an action handler for an intent.
 * Returns an unregister function for cleanup.
 */
export function registerIntent(
  action: string,
  handler: IntentHandler
): () => void {
  intentRegistry.set(action, handler);
  return () => {
    intentRegistry.delete(action);
  };
}

/**
 * Checks if an action is currently registered.
 */
export function hasRegisteredIntent(action: string): boolean {
  return intentRegistry.has(action);
}

/**
 * Formats an intent string in the standard format action:targetType:targetId
 */
export function formatIntent(
  action: string,
  targetType: string,
  targetId: string
): string {
  return `${action}:${targetType}:${targetId}`;
}

/**
 * Parses and strictly validates an intent string.
 * Must match action:targetType:targetId with valid characters.
 */
export function parseIntent(
  raw: string | null | undefined
): ParsedIntent | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  const parts = raw.split(":");
  if (parts.length !== 3) {
    return null;
  }

  const [action, targetType, targetId] = parts;

  // Strict identifier validation: alphanumeric, hyphens, and underscores
  const validRegex = /^[a-zA-Z0-9_-]+$/;
  if (
    !validRegex.test(action) ||
    !validRegex.test(targetType) ||
    !validRegex.test(targetId)
  ) {
    return null;
  }

  return { action, targetType, targetId };
}

/**
 * Executes a registered intent. Returns true if executed successfully, false otherwise.
 */
export async function executeIntent(intentString: string): Promise<boolean> {
  const parsed = parseIntent(intentString);
  if (!parsed) {
    return false;
  }

  const handler = intentRegistry.get(parsed.action);
  if (!handler) {
    return false;
  }

  try {
    await handler(parsed.targetType, parsed.targetId);
    return true;
  } catch (err) {
    console.error(`Failed to execute intent "${parsed.action}":`, err);
    return false;
  }
}

/**
 * Returns a user-friendly, one-line contextual explanation for auth pages
 * when a user was redirected from a gated action.
 */
export function getIntentContextMessage(
  rawIntent: string | null | undefined
): string | null {
  const parsed = parseIntent(rawIntent);
  if (!parsed) return null;

  switch (parsed.action) {
    case 'like':
      return 'Sign in to like this creation and track your favorites.';
    case 'save':
      return 'Sign in to save this creation to your collection.';
    case 'copy':
      return 'Sign in to copy prompts and workflow recipes.';
    case 'create':
      return 'Sign in to publish your AI creation.';
    default:
      return 'Sign in to continue your action.';
  }
}
