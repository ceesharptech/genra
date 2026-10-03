import { describe, it, expect } from "vitest";
import { buildSavePayload, type CreationFormState } from "@/lib/creations/payload";
import type { Tool } from "@/lib/data/creations";

describe("buildSavePayload", () => {
  const baseState: CreationFormState = {
    creationId: "11111111-1111-4111-8111-111111111111",
    title: "Test Creation",
    summary: "A nice summary",
    description: "Detailed description",
    categoryId: 1,
    liveUrl: "https://example.com",
    repoUrl: "https://github.com/example/repo",
    coverMediaId: null,
    attributes: {},
    tools: [
      {
        tool_id: 1,
        role: "primary",
        version: "v1.0",
        position: 0,
        tool: { id: 1, name: "Tool 1", slug: "tool-1", kind: "ai_app" } as unknown as Tool,
      },
    ],
    tags: ["design", "ai"],
    steps: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        title: "Step 1",
        body: "Step body",
        position: 0,
      },
    ],
    media: [],
    prompts: [],
    resources: [],
    status: "draft",
  };

  it("excludes media items that are currently uploading", () => {
    const uploadingItem = {
      id: "media-uploading",
      kind: "image" as const,
      role: "gallery" as const,
      storage_path: null,
      external_url: null,
      mime_type: "image/png",
      width: null,
      height: null,
      duration_ms: null,
      alt_text: null,
      caption: null,
      position: 0,
      step_id: null,
      isUploading: true,
    };

    const completedItem = {
      id: "media-completed",
      kind: "image" as const,
      role: "gallery" as const,
      storage_path: "user/creation/media-completed.webp",
      external_url: null,
      mime_type: "image/webp",
      width: 800,
      height: 600,
      duration_ms: null,
      alt_text: null,
      caption: null,
      position: 1,
      step_id: null,
      isUploading: false,
    };

    const state: CreationFormState = {
      ...baseState,
      media: [uploadingItem, completedItem],
      coverMediaId: "media-completed",
    };

    const payload = buildSavePayload(state, "save");

    expect(payload.media).toHaveLength(1);
    expect(payload.media[0].id).toBe("media-completed");
    expect(payload.creation.cover_media_id).toBe("media-completed");
  });

  it("nulls cover_media_id when the cover item is still uploading or has no storage_path/external_url", () => {
    const uploadingCover = {
      id: "cover-uploading",
      kind: "image" as const,
      role: "thumbnail" as const,
      storage_path: null,
      external_url: null,
      mime_type: "image/png",
      width: null,
      height: null,
      duration_ms: null,
      alt_text: null,
      caption: null,
      position: 0,
      step_id: null,
      isUploading: true,
    };

    const state: CreationFormState = {
      ...baseState,
      media: [uploadingCover],
      coverMediaId: "cover-uploading",
    };

    const payload = buildSavePayload(state, "save");

    expect(payload.media).toHaveLength(0);
    expect(payload.creation.cover_media_id).toBeNull();
  });

  it("includes completed media and sets cover_media_id when valid", () => {
    const completedCover = {
      id: "cover-ready",
      kind: "image" as const,
      role: "thumbnail" as const,
      storage_path: "user/creation/cover-ready.webp",
      external_url: null,
      mime_type: "image/webp",
      width: 1200,
      height: 630,
      duration_ms: null,
      alt_text: "Cover alt",
      caption: "Cover caption",
      position: 0,
      step_id: null,
      isUploading: false,
    };

    const videoEmbed = {
      id: "video-embed",
      kind: "embed" as const,
      role: "gallery" as const,
      storage_path: null,
      external_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      mime_type: null,
      width: null,
      height: null,
      duration_ms: null,
      alt_text: "Video demo",
      caption: null,
      position: 1,
      step_id: null,
      isUploading: false,
    };

    const state: CreationFormState = {
      ...baseState,
      media: [completedCover, videoEmbed],
      coverMediaId: "cover-ready",
    };

    const payload = buildSavePayload(state, "save");

    expect(payload.media).toHaveLength(2);
    expect(payload.creation.cover_media_id).toBe("cover-ready");
    expect(payload.media[0].role).toBe("thumbnail");
    expect(payload.media[1].role).toBe("gallery");
  });
});
