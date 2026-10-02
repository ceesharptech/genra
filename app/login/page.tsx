import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth/server";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { LoginForm } from "@/components/auth/login-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in to Genra",
  description: "Sign in to Genra to like, save, comment, and publish creations.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    intent?: string;
    error?: string;
  }>;
}) {
  const { next, intent, error } = await searchParams;
  const safeNext = safeRedirectPath(next, "/");

  // If already signed in, redirect appropriately
  const user = await getCurrentUser();
  if (user) {
    const profile = await getCurrentProfile();
    if (!profile || !profile.onboarded_at) {
      redirect(`/onboarding?next=${encodeURIComponent(safeNext)}`);
    } else {
      const target = intent
        ? safeNext.includes("?")
          ? `${safeNext}&intent=${encodeURIComponent(intent)}`
          : `${safeNext}?intent=${encodeURIComponent(intent)}`
        : safeNext;
      redirect(target);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xs sm:p-8">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-block text-xl font-semibold tracking-tight text-foreground"
          >
            Genra
          </Link>
          <h1 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
            Sign in to your account
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Discover, learn from, and share AI creations
          </p>
        </div>

        <LoginForm
          next={safeNext}
          intent={intent}
          errorParam={error}
        />
      </div>
    </div>
  );
}
