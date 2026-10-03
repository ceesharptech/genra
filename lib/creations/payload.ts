import type { SelectedTool } from "@/components/creations/tool-selector";
import type { StepItem } from "@/components/creations/steps-editor";
import type { MediaItem } from "@/components/creations/media-uploader";
import type { SelectedPrompt } from "@/components/creations/prompt-picker-dialog";
import type { SelectedResource } from "@/components/creations/resource-picker-dialog";
import type { SaveCreationPayload } from "@/lib/validation/creation";

export interface CreationFormState {
  creationId: string;
  title: string;
  summary: string | null;
  description: string | null;
  categoryId: number | null;
  liveUrl: string | null;
  repoUrl: string | null;
  coverMediaId: string | null;
  attributes?: Record<string, unknown>;
  tools: SelectedTool[];
  tags: string[];
  steps: StepItem[];
  media: MediaItem[];
  prompts: SelectedPrompt[];
  resources: SelectedResource[];
  status: "draft" | "published" | "archived";
}

/**
 * Builds the canonical SaveCreationPayload for saving a draft or publishing.
 * Strictly filters out any media still uploading or without a valid storage_path/external_url.
 * If the selected coverMediaId is still uploading or invalid, cover_media_id is sent as null.
 */
export function buildSavePayload(
  state: CreationFormState,
  action: "save" | "publish" = "save"
): SaveCreationPayload {
  // 1. Only completed media (has storage_path or external_url, not currently uploading)
  const completedMedia = state.media.filter(
    (m) => !m.isUploading && Boolean(m.storage_path || m.external_url)
  );

  // 2. Cover media must exist in completedMedia
  const hasValidCover = completedMedia.some((m) => m.id === state.coverMediaId);
  const coverMediaId = hasValidCover ? state.coverMediaId : null;

  return {
    action,
    creation: {
      id: state.creationId,
      title: state.title.trim() || (state.status === "draft" ? "Untitled creation" : ""),
      summary: state.summary?.trim() || null,
      description: state.description?.trim() || null,
      category_id: state.categoryId,
      live_url: state.liveUrl?.trim() || null,
      repo_url: state.repoUrl?.trim() || null,
      cover_media_id: coverMediaId,
      attributes: state.attributes || {},
    },
    tools: state.tools.map((t, idx) => ({
      tool_id: t.tool_id,
      role: t.role,
      version: t.version || null,
      position: idx,
    })),
    tags: state.tags,
    steps: state.steps.map((s, idx) => ({
      id: s.id,
      position: idx,
      title: s.title.trim() || `Step ${idx + 1}`,
      body: s.body?.trim() || null,
    })),
    media: completedMedia.map((m, idx) => ({
      id: m.id,
      kind: m.kind,
      role: m.id === coverMediaId ? "thumbnail" : "gallery",
      storage_path: m.storage_path || null,
      external_url: m.external_url || null,
      mime_type: m.mime_type || null,
      width: m.width || null,
      height: m.height || null,
      duration_ms: m.duration_ms || null,
      alt_text: m.alt_text || null,
      caption: m.caption || null,
      position: idx,
      step_id: m.step_id || null,
    })),
    prompts: state.prompts.map((p, idx) => ({
      prompt_id: p.prompt_id,
      step_id: p.step_id || null,
      position: idx,
      note: p.note || null,
    })),
    resources: state.resources.map((r, idx) => ({
      resource_id: r.resource_id,
      position: idx,
      note: r.note || null,
    })),
  };
}

/**
 * Returns a deterministic JSON string representing the saveable state of a creation.
 */
export function serializeCreationSnapshot(state: CreationFormState): string {
  const payload = buildSavePayload(state, "save");
  return JSON.stringify(payload);
}
