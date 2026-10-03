import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { getPublishedCreationBySlug } from "@/lib/data/creations";
import { CreationView } from "@/components/creations/creation-view";
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
  const creation = await getPublishedCreationBySlug(slug);

  if (!creation) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const isOwner = currentUser?.id === creation.creator_id;

  // Non-published creations are only visible to their creator
  if (creation.status !== "published" && !isOwner) {
    notFound();
  }

  return <CreationView creation={creation} isOwner={isOwner} />;
}
