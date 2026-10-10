"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOnboardedUser } from "@/lib/auth/server";
import {
  saveCreationPayloadSchema,
  publishCreationSchema,
  proposeToolSchema,
  quickCreatePromptSchema,
  quickCreateResourceSchema,
} from "@/lib/validation/creation";
import { slugify } from "@/lib/validation/creation-helpers";
import { getEnrichmentProvider } from "@/lib/ai/enrichment";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/auth/types";
import type { Database } from "@/types/database";
import {
  searchTools,
  searchPrompts,
  searchResources,
  type ResourceKind,
} from "@/lib/data/creations";
import { perfLog } from "@/lib/perf";
import { checkRateLimit } from "@/lib/rate-limit";

export type Tool = Database["public"]["Tables"]["tools"]["Row"];
export type Prompt = Database["public"]["Tables"]["prompts"]["Row"];
export type Resource = Database["public"]["Tables"]["resources"]["Row"];

export interface SaveCreationResult {
  id: string;
  slug: string;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  updated_at: string;
}

function mapDatabaseError(error: { code?: string; message?: string }): string {
  const code = error.code;
  const msg = error.message || "";

  if (code === "23514" || msg.includes("creation_media_check")) {
    return "One or more media items have not finished uploading or are missing a valid link.";
  }
  if (
    code === "42501" ||
    msg.includes("Authentication required") ||
    msg.includes("not own")
  ) {
    return "You do not have permission to modify this creation.";
  }
  if (code === "P0002" || msg.includes("title of at least 3 characters")) {
    return "A title of at least 3 characters is required to publish.";
  }
  if (code === "P0003" || msg.includes("valid category")) {
    return "A valid category is required to publish.";
  }
  if (code === "P0004" || msg.includes("valid cover image")) {
    return "A valid cover image is required to publish.";
  }
  if (code === "P0005" || msg.includes("At least one tool")) {
    return "At least one tool is required to publish.";
  }
  if (code === "23503") {
    return "One or more referenced tools, prompts, or resources could not be found.";
  }
  return error.message || "Failed to save creation";
}

/**
 * Saves a creation draft or publishes it atomically using save_creation RPC.
 */
export async function saveCreationAction(
  rawPayload: unknown
): Promise<ActionResult<SaveCreationResult>> {
  try {
    const { user } = await requireOnboardedUser();

    // 1. Validate payload structure
    const parseResult = saveCreationPayloadSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      parseResult.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      });
      return actionError("Invalid creation payload", fieldErrors);
    }

    const payload = parseResult.data;

    // Rate limiting: publish (10/min) or draft save (30/min)
    const rateAction = payload.action === "publish" ? "publish_creation" : "save_creation";
    const rateCheck = await checkRateLimit(rateAction, user.id);
    if (!rateCheck.success) {
      return actionError("Too many save requests. Please wait a moment before trying again.");
    }

    // 2. If publishing, perform strict validation
    if (payload.action === "publish") {
      const publishCheck = publishCreationSchema.safeParse({
        ...payload.creation,
        tools: payload.tools,
        tags: payload.tags,
        steps: payload.steps,
        media: payload.media,
        prompts: payload.prompts,
        resources: payload.resources,
      });

      if (!publishCheck.success) {
        const fieldErrors: Record<string, string[]> = {};
        publishCheck.error.issues.forEach((issue) => {
          const path = issue.path.join(".");
          if (!fieldErrors[path]) fieldErrors[path] = [];
          fieldErrors[path].push(issue.message);
        });
        const firstMessage =
          publishCheck.error.issues[0]?.message ||
          "Creation does not meet publishing requirements";
        return actionError(firstMessage, fieldErrors);
      }
    }

    // 3. Call atomic save_creation RPC on Supabase
    const supabase = await createClient();
    const rpcStart = performance.now();
    const { data, error } = await supabase.rpc("save_creation", {
      payload: payload as unknown as Database["public"]["Tables"]["creations"]["Row"]["attributes"],
    });
    perfLog("save_creation RPC", performance.now() - rpcStart);

    if (error) {
      console.error("RPC save_creation failed:", error);
      return actionError(mapDatabaseError(error));
    }

    const result = data as unknown as SaveCreationResult;

    // 4. Trigger enrichment stub if published (noop in V1)
    if (payload.action === "publish") {
      try {
        const enrichment = getEnrichmentProvider();
        await enrichment.enqueue(result.id);
      } catch (e) {
        console.warn("Enrichment enqueue warning:", e);
      }
    }

    // 5. Revalidate cache
    revalidatePath("/creations");
    revalidatePath(`/c/${result.slug}`);
    revalidatePath(`/c/${result.slug}/edit`);

    return actionSuccess(result);
  } catch (err: unknown) {
    const error = err as Error;
    if (error?.name === "AuthRequiredError") {
      return actionError("Authentication required to save creations");
    }
    if (error?.name === "OnboardingRequiredError") {
      return actionError("Please choose a username before creating");
    }
    console.error("Unhandled error in saveCreationAction:", error);
    return actionError(error?.message || "An unexpected error occurred");
  }
}

/**
 * Changes creation status (e.g. unpublish to archive).
 */
export async function setCreationStatusAction(
  id: string,
  newStatus: "published" | "archived"
): Promise<ActionResult<void>> {
  try {
    const { user } = await requireOnboardedUser();

    const rateCheck = await checkRateLimit("publish_creation", user.id);
    if (!rateCheck.success) {
      return actionError("Too many status changes. Please wait a moment.");
    }

    const supabase = await createClient();

    const { data: creation, error: fetchErr } = await supabase
      .from("creations")
      .select("creator_id, slug")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !creation) {
      return actionError("Creation not found");
    }

    if (creation.creator_id !== user.id) {
      return actionError("You do not own this creation");
    }

    const { error: updateErr } = await supabase
      .from("creations")
      .update({ status: newStatus })
      .eq("id", id);

    if (updateErr) {
      return actionError(updateErr.message);
    }

    revalidatePath("/creations");
    revalidatePath(`/c/${creation.slug}`);
    revalidatePath(`/c/${creation.slug}/edit`);

    return actionSuccess();
  } catch (err: unknown) {
    const error = err as Error;
    return actionError(error?.message || "Failed to update status");
  }
}

/**
 * Soft deletes a creation by setting deleted_at = now().
 */
export async function deleteCreationAction(id: string): Promise<ActionResult<void>> {
  try {
    const { user } = await requireOnboardedUser();

    const rateCheck = await checkRateLimit("publish_creation", user.id);
    if (!rateCheck.success) {
      return actionError("Too many delete requests. Please wait a moment.");
    }

    const supabase = await createClient();

    const { data: creation, error: fetchErr } = await supabase
      .from("creations")
      .select("creator_id, slug")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !creation) {
      return actionError("Creation not found");
    }

    if (creation.creator_id !== user.id) {
      return actionError("You do not own this creation");
    }

    const { error: delErr } = await supabase
      .from("creations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (delErr) {
      return actionError(delErr.message);
    }

    revalidatePath("/creations");
    revalidatePath(`/c/${creation.slug}`);

    return actionSuccess();
  } catch (err: unknown) {
    const error = err as Error;
    return actionError(error?.message || "Failed to delete creation");
  }
}

/**
 * Proposes a new unverified tool inline from the tool selector.
 */
export async function proposeToolAction(
  rawInput: unknown
): Promise<ActionResult<Tool>> {
  try {
    const { user } = await requireOnboardedUser();
    const parse = proposeToolSchema.safeParse(rawInput);
    if (!parse.success) {
      return actionError(
        parse.error.issues[0]?.message || "Invalid tool input"
      );
    }

    const rateCheck = await checkRateLimit("propose_tool", user.id);
    if (!rateCheck.success) {
      return actionError("Too many tool proposals. Please wait a moment.");
    }

    const { name, kind, website_url } = parse.data;
    const slug = slugify(name);
    const supabase = await createClient();

    // Check if tool already exists with this slug
    const { data: existing } = await supabase
      .from("tools")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return actionSuccess(existing);
    }

    const { data: newTool, error } = await supabase
      .from("tools")
      .insert({
        name,
        slug,
        kind,
        website_url: website_url || null,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error || !newTool) {
      return actionError(error?.message || "Failed to create tool");
    }

    return actionSuccess(newTool);
  } catch (err: unknown) {
    const error = err as Error;
    return actionError(error?.message || "Failed to propose tool");
  }
}

/**
 * Quick-creates a new prompt inline from the prompt picker dialog.
 */
export async function quickCreatePromptAction(
  rawInput: unknown
): Promise<ActionResult<Prompt>> {
  try {
    const { user } = await requireOnboardedUser();
    const parse = quickCreatePromptSchema.safeParse(rawInput);
    if (!parse.success) {
      return actionError(
        parse.error.issues[0]?.message || "Invalid prompt input"
      );
    }

    const rateCheck = await checkRateLimit("prompt_create", user.id);
    if (!rateCheck.success) {
      return actionError("Too many requests. Please wait a moment.");
    }

    const { title, body, kind, model_tool_id, is_public } = parse.data;
    const supabase = await createClient();

    const { data: prompt, error } = await supabase
      .from("prompts")
      .insert({
        title,
        body,
        kind,
        model_tool_id: model_tool_id || null,
        is_public,
        author_id: user.id,
      })
      .select("*")
      .single();

    if (error || !prompt) {
      return actionError(error?.message || "Failed to create prompt");
    }

    return actionSuccess(prompt);
  } catch (err: unknown) {
    const error = err as Error;
    return actionError(error?.message || "Failed to create prompt");
  }
}

/**
 * Quick-creates a new resource inline from the resource picker dialog.
 */
export async function quickCreateResourceAction(
  rawInput: unknown
): Promise<ActionResult<Resource>> {
  try {
    const { user } = await requireOnboardedUser();
    const parse = quickCreateResourceSchema.safeParse(rawInput);
    if (!parse.success) {
      return actionError(
        parse.error.issues[0]?.message || "Invalid resource input"
      );
    }

    const rateCheck = await checkRateLimit("resource_create", user.id);
    if (!rateCheck.success) {
      return actionError("Too many requests. Please wait a moment.");
    }

    const { title, kind, url, description, tool_id, is_public } = parse.data;
    const supabase = await createClient();

    const { data: resource, error } = await supabase
      .from("resources")
      .insert({
        title,
        kind,
        url: url || null,
        description: description || null,
        tool_id: tool_id || null,
        is_public,
        author_id: user.id,
      })
      .select("*")
      .single();

    if (error || !resource) {
      return actionError(error?.message || "Failed to create resource");
    }

    return actionSuccess(resource);
  } catch (err: unknown) {
    const error = err as Error;
    return actionError(error?.message || "Failed to create resource");
  }
}

/**
 * Deletes unused storage files from creation-media bucket when removed from editor.
 */
export async function deleteMediaFromStorageAction(
  storagePaths: string[]
): Promise<ActionResult<void>> {
  try {
    const { user } = await requireOnboardedUser();
    if (!storagePaths.length) return actionSuccess();

    // Security check: ensure all paths start with user's id
    const validPaths = storagePaths.filter((path) =>
      path.startsWith(`${user.id}/`)
    );
    if (!validPaths.length) return actionSuccess();

    const supabase = await createClient();
    const { error } = await supabase.storage
      .from("creation-media")
      .remove(validPaths);

    if (error) {
      console.warn("Storage deletion warning:", error);
    }

    return actionSuccess();
  } catch (err: unknown) {
    const error = err as Error;
    return actionError(error?.message || "Failed to delete storage media");
  }
}

/**
 * Searches tools for the tool selector combobox.
 */
export async function searchToolsAction(query = ""): Promise<Tool[]> {
  return await searchTools(query);
}

/**
 * Searches prompts for the prompt picker dialog.
 */
export async function searchPromptsAction(query = "", limit = 20) {
  return await searchPrompts(query, limit);
}

/**
 * Searches resources for the resource picker dialog.
 */
export async function searchResourcesAction(
  query = "",
  kind?: ResourceKind,
  limit = 20
) {
  return await searchResources(query, kind, limit);
}

