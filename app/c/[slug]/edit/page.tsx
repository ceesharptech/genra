import { redirect, notFound } from "next/navigation";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/server";
import {
  getCreationForEdit,
  listCategories,
  searchTools,
} from "@/lib/data/creations";
import { CreationEditor } from "@/components/creations/creation-editor";
import type { Metadata } from "next";

interface EditCreationPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: EditCreationPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Edit Creation - ${slug}`,
    description: "Edit your Genra creation.",
  };
}

export default async function EditCreationPage({
  params,
}: EditCreationPageProps) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/c/${slug}/edit`);
  }

  const profile = await getCurrentProfile();
  if (!profile || !profile.onboarded_at) {
    redirect(`/onboarding?next=/c/${slug}/edit`);
  }

  const creation = await getCreationForEdit(slug);
  if (!creation) {
    notFound();
  }

  // Ensure caller is the owner
  if (creation.creator_id !== user.id) {
    redirect("/creations");
  }

  const categories = await listCategories();
  const allTools = await searchTools();

  return (
    <CreationEditor
      initialData={{
        id: creation.id,
        slug: creation.slug,
        title: creation.title,
        summary: creation.summary,
        description: creation.description,
        category_id: creation.category_id,
        status: creation.status,
        live_url: creation.live_url,
        repo_url: creation.repo_url,
        cover_media_id: creation.cover_media_id,
        attributes: creation.attributes || {},
        tools: (creation.tools || []).map((t) => ({
          tool_id: t.tool_id,
          role: t.role as "primary" | "supporting",
          version: t.version,
          position: t.position,
          tool: t.tool,
        })),
        tags: (creation.tags || []).map((tg) => tg.tag.name),
        steps: (creation.steps || []).map((s) => ({
          id: s.id,
          position: s.position,
          title: s.title,
          body: s.body,
        })),
        media: (creation.media || []).map((m) => ({
          id: m.id,
          kind: m.kind,
          role: m.role,
          storage_path: m.storage_path,
          external_url: m.external_url,
          mime_type: m.mime_type,
          width: m.width,
          height: m.height,
          duration_ms: m.duration_ms,
          alt_text: m.alt_text,
          caption: m.caption,
          position: m.position,
          step_id: m.step_id,
        })),
        prompts: (creation.prompts || []).map((p) => ({
          prompt_id: p.prompt_id,
          step_id: p.step_id,
          position: p.position,
          note: p.note,
          prompt: p.prompt,
        })),
        resources: (creation.resources || []).map((r) => ({
          resource_id: r.resource_id,
          position: r.position,
          note: r.note,
          resource: r.resource,
        })),
      }}
      categories={categories}
      allTools={allTools}
      userId={user.id}
    />
  );
}
