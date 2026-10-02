"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getCurrentProfile } from "@/lib/auth/server";
import {
  onboardingSchema,
  profileUpdateSchema,
  usernameSchema,
} from "@/lib/validation/auth";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/auth/types";

/**
 * Checks whether a given username is valid, unreserved, and available in the database.
 */
export async function checkUsernameAvailability(
  username: string
): Promise<{ available: boolean; error?: string }> {
  const parseResult = usernameSchema.safeParse(username);
  if (!parseResult.success) {
    return {
      available: false,
      error: parseResult.error.issues[0]?.message || "Invalid username format",
    };
  }

  const supabase = await createClient();
  const currentProfile = await getCurrentProfile();

  // If user is checking their own current username, it's valid for them
  if (
    currentProfile &&
    currentProfile.username.toLowerCase() === username.toLowerCase()
  ) {
    return { available: true };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    return { available: false, error: "Database error checking availability" };
  }

  if (data) {
    return { available: false, error: "This username is already taken" };
  }

  return { available: true };
}

export type OnboardingInput = {
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
};

/**
 * Completes user onboarding by assigning a real username and display name,
 * and setting onboarded_at to the current timestamp.
 */
export async function completeOnboardingAction(
  input: OnboardingInput
): Promise<ActionResult<{ username: string }>> {
  const user = await requireUser();

  const parseResult = onboardingSchema.safeParse(input);
  if (!parseResult.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parseResult.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(issue.message);
    }
    return actionError("Validation failed", fieldErrors);
  }

  const { username, display_name, avatar_url } = parseResult.data;

  // Double check availability
  const check = await checkUsernameAvailability(username);
  if (!check.available) {
    return actionError(check.error || "Username is not available", {
      username: [check.error || "Username is not available"],
    });
  }

  const supabase = await createClient();

  const updatePayload: {
    username: string;
    display_name: string | null;
    onboarded_at: string;
    avatar_url?: string | null;
  } = {
    username,
    display_name: display_name || null,
    onboarded_at: new Date().toISOString(),
  };

  if (avatar_url !== undefined) {
    updatePayload.avatar_url = avatar_url;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return actionError("This username is already taken. Please choose another.", {
        username: ["This username is already taken."],
      });
    }
    return actionError(error.message || "Failed to complete onboarding.");
  }

  revalidatePath("/", "layout");
  revalidatePath(`/u/${username}`);

  return actionSuccess({ username });
}

export type ProfileUpdateInput = {
  username: string;
  display_name?: string | null;
  headline?: string | null;
  bio?: string | null;
  website_url?: string | null;
  social_links?: Record<string, string>;
};

/**
 * Updates an authenticated user's profile details.
 */
export async function updateProfileAction(
  input: ProfileUpdateInput
): Promise<ActionResult<{ username: string }>> {
  const user = await requireUser();

  const parseResult = profileUpdateSchema.safeParse(input);
  if (!parseResult.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parseResult.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(issue.message);
    }
    return actionError("Validation failed", fieldErrors);
  }

  const {
    username,
    display_name,
    headline,
    bio,
    website_url,
    social_links,
  } = parseResult.data;

  const currentProfile = await getCurrentProfile();

  // If changing username, check availability
  if (
    !currentProfile ||
    currentProfile.username.toLowerCase() !== username.toLowerCase()
  ) {
    const check = await checkUsernameAvailability(username);
    if (!check.available) {
      return actionError(check.error || "Username is not available", {
        username: [check.error || "Username is not available"],
      });
    }
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      display_name: display_name || null,
      headline: headline || null,
      bio: bio || null,
      website_url: website_url || null,
      social_links: social_links || {},
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return actionError("This username is already taken.", {
        username: ["This username is already taken."],
      });
    }
    return actionError(error.message || "Failed to update profile.");
  }

  revalidatePath("/", "layout");
  if (currentProfile) {
    revalidatePath(`/u/${currentProfile.username}`);
  }
  revalidatePath(`/u/${username}`);
  revalidatePath("/settings");

  return actionSuccess({ username });
}

/**
 * Updates avatar URL or clears it.
 */
export async function updateAvatarUrlAction(
  avatarUrl: string | null
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (error) {
    return actionError(error.message || "Failed to update avatar.");
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  return actionSuccess();
}
