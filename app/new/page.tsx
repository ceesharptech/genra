import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/server";
import { listCategories, searchTools } from "@/lib/data/creations";
import { CreationEditor } from "@/components/creations/creation-editor";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Creation · Genra",
  description: "Publish your AI-created project on Genra.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewCreationPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/new&intent=create");
  }

  const profile = await getCurrentProfile();
  if (!profile || !profile.onboarded_at) {
    redirect("/onboarding?next=/new");
  }

  const categories = await listCategories();
  const allTools = await searchTools();

  // Generate initial client-side UUID so uploads can start before first save
  const newCreationId = crypto.randomUUID();

  return (
    <CreationEditor
      initialData={{
        id: newCreationId,
        slug: "",
        title: "",
        summary: null,
        description: null,
        category_id: null,
        status: "draft",
        live_url: null,
        repo_url: null,
        cover_media_id: null,
        attributes: {},
        tools: [],
        tags: [],
        steps: [],
        media: [],
        prompts: [],
        resources: [],
      }}
      categories={categories}
      allTools={allTools}
      userId={user.id}
    />
  );
}
