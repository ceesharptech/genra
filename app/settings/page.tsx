import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/server";
import { SettingsForm } from "@/components/profile/settings-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile Settings · Genra",
  description: "Manage your Genra profile, social links, and account settings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/settings");
  }

  const profile = await getCurrentProfile();
  if (!profile || !profile.onboarded_at) {
    redirect("/onboarding?next=/settings");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8">
        <h1 className="font-bricolage text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your public profile information, avatar, and linked social channels.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-xs sm:p-8">
        <SettingsForm userId={user.id} profile={profile} />
      </div>
    </div>
  );
}
