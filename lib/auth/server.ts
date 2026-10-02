import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { User } from "@supabase/supabase-js";
import { AuthRequiredError, OnboardingRequiredError } from "./types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Returns the currently authenticated user by verifying the session with Supabase Auth.
 * Memoised per request with React cache.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
});

/**
 * Returns the profile for the currently authenticated user.
 * Memoised per request with React cache.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  return profile;
});

/**
 * Requires an authenticated user for Server Actions or Server Components.
 * Throws AuthRequiredError when signed out.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthRequiredError();
  }
  return user;
}

/**
 * Requires an authenticated user with completed onboarding.
 * Throws AuthRequiredError when signed out, or OnboardingRequiredError when onboarding is pending.
 */
export async function requireOnboardedUser(): Promise<{
  user: User;
  profile: Profile;
}> {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  if (!profile || !profile.onboarded_at) {
    throw new OnboardingRequiredError();
  }

  return { user, profile };
}
