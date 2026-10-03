import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { getPublishedCreationBySlug } from "@/lib/data/creations";
import { CreationView } from "@/components/creations/creation-view";
import { MarkdownView } from "@/components/ui/markdown-view";
import type { Metadata } from "next";

interface CreationPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: CreationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const creation = await getPublishedCreationBySlug(slug);

  if (!creation) {
    return {
      title: "Creation Not Found",
    };
  }

  return {
    title: `${creation.title} - Genra`,
    description:
      creation.summary ||
      `Discover how ${creation.title} was built with AI on Genra.`,
  };
}

export default async function CreationPage({ params }: CreationPageProps) {
  const { slug } = await params;

  // Run data fetch and user check in parallel
  const [creation, currentUser] = await Promise.all([
    getPublishedCreationBySlug(slug),
    getCurrentUser(),
  ]);

  if (!creation) {
    notFound();
  }

  const isOwner = currentUser?.id === creation.creator_id;

  // Non-published creations are only visible to their creator
  if (creation.status !== "published" && !isOwner) {
    notFound();
  }

  // Pre-render markdown on the server so client bundle never includes react-markdown
  const descriptionNode = creation.description ? (
    <MarkdownView content={creation.description} />
  ) : null;

  const stepBodyNodes: Record<string, React.ReactNode> = {};
  for (const step of creation.steps) {
    if (step.body) {
      stepBodyNodes[step.id] = <MarkdownView content={step.body} />;
    }
  }

  return (
    <CreationView
      creation={creation}
      isOwner={isOwner}
      descriptionNode={descriptionNode}
      stepBodyNodes={stepBodyNodes}
    />
  );
}
