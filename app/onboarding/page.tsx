import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/server";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { OnboardingForm } from "@/components/profile/onboarding-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome to Genra — Set Up Your Profile",
  description: "Choose your Genra username and customize your profile.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/onboarding");
  }

  const profile = await getCurrentProfile();
  const { next } = await searchParams;
  const safeNext = safeRedirectPath(next, "/");

  // If already onboarded, redirect away to avoid redirect loops
  if (profile && profile.onboarded_at) {
    redirect(safeNext);
  }

  // Pre-fill initial username and display name
  const initialUsername =
    profile?.username ||
    user.email?.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "") ||
    "user";
  const initialDisplayName =
    profile?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "";
  const initialAvatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null;

  return (
    <div className="flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xs sm:p-8">
        <div className="mb-6 text-center">
          <span className="bg-foreground text-background inline-flex size-7 items-center justify-center rounded-lg font-mono text-sm font-bold">
            G
          </span>
          <h1 className="font-bricolage mt-3 text-xl font-semibold tracking-tight text-foreground">
            Welcome to Genra
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a unique username to represent your AI creations and tools.
          </p>
        </div>

        <OnboardingForm
          userId={user.id}
          initialUsername={initialUsername}
          initialDisplayName={initialDisplayName}
          initialAvatarUrl={initialAvatarUrl}
          next={safeNext}
        />
      </div>
    </div>
  );
}
