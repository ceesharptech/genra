"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/database";
import {
  checkUsernameAvailability,
  updateProfileAction,
  updateAvatarUrlAction,
} from "@/lib/profile/actions";
import {
  profileUpdateSchema,
  ALLOWED_SOCIAL_PLATFORMS,
  type SocialPlatform,
} from "@/lib/validation/auth";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface SettingsFormProps {
  userId: string;
  profile: Profile;
}

export function SettingsForm({ userId, profile }: SettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [headline, setHeadline] = useState(profile.headline || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);

  // Social links parsed from profile.social_links
  const rawSocial = (profile.social_links as Record<string, string>) || {};
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({
    github: rawSocial.github || "",
    x: rawSocial.x || "",
    linkedin: rawSocial.linkedin || "",
    youtube: rawSocial.youtube || "",
    instagram: rawSocial.instagram || "",
    dribbble: rawSocial.dribbble || "",
  });

  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{
    available: boolean;
    message?: string;
  } | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Debounced check for username if changed from current
  useEffect(() => {
    const trimmed = username.trim();
    const timer = setTimeout(async () => {
      if (!trimmed || trimmed.toLowerCase() === profile.username.toLowerCase()) {
        setUsernameStatus(null);
        setIsCheckingUsername(false);
        return;
      }

      setIsCheckingUsername(true);
      try {
        const res = await checkUsernameAvailability(trimmed);
        if (res.available) {
          setUsernameStatus({ available: true, message: "Username is available" });
        } else {
          setUsernameStatus({ available: false, message: res.error });
        }
      } catch {
        setUsernameStatus({
          available: false,
          message: "Could not verify username",
        });
      } finally {
        setIsCheckingUsername(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, profile.username]);

  const handleAvatarChange = async (newUrl: string | null) => {
    setAvatarUrl(newUrl);
    try {
      await updateAvatarUrlAction(newUrl);
      toast.success(newUrl ? "Avatar updated" : "Avatar removed");
      router.refresh();
    } catch {
      toast.error("Failed to update avatar in profile");
    }
  };

  const handleSocialChange = (platform: SocialPlatform, val: string) => {
    setSocialLinks((prev) => ({ ...prev, [platform]: val }));
    setFieldErrors((prev) => ({ ...prev, social_links: [] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Filter non-empty social links
    const cleanSocial: Record<string, string> = {};
    for (const [k, v] of Object.entries(socialLinks)) {
      if (v.trim()) cleanSocial[k] = v.trim();
    }

    const payload = {
      username: username.trim(),
      display_name: displayName.trim() || null,
      headline: headline.trim() || null,
      bio: bio.trim() || null,
      website_url: websiteUrl.trim() || null,
      social_links: cleanSocial,
    };

    const parseResult = profileUpdateSchema.safeParse(payload);
    if (!parseResult.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = [];
        errors[field].push(issue.message);
      }
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      const res = await updateProfileAction(payload);
      if (!res.ok) {
        setFormError(res.error);
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
        toast.error("Failed to update settings");
        return;
      }

      toast.success("Profile updated successfully");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {formError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
        >
          {formError}
        </div>
      )}

      {/* Avatar Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Profile Photo
        </h2>
        <AvatarUpload
          userId={userId}
          currentAvatarUrl={avatarUrl}
          onAvatarUploaded={handleAvatarChange}
          disabled={isPending}
        />
      </section>

      <div className="h-px bg-border" />

      {/* Basic Info Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Public Profile
        </h2>

        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="username" className="text-xs font-medium">
              Username <span className="text-destructive">*</span>
            </Label>
            <span className="text-[11px] text-muted-foreground">genra.io/u/{username}</span>
          </div>

          <div className="relative">
            <Input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setFieldErrors((prev) => ({ ...prev, username: [] }));
              }}
              disabled={isPending}
              className="h-10 pr-9 font-mono text-sm"
            />

            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              {isCheckingUsername ? (
                <span className="size-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              ) : usernameStatus ? (
                usernameStatus.available ? (
                  <HugeiconsIcon icon={Tick02Icon} className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <HugeiconsIcon icon={Cancel01Icon} className="size-4 text-destructive" />
                )
              ) : null}
            </div>
          </div>

          {usernameStatus && (
            <p
              className={`text-xs ${
                usernameStatus.available
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              }`}
            >
              {usernameStatus.message}
            </p>
          )}

          {fieldErrors.username && (
            <p className="text-xs text-destructive">{fieldErrors.username[0]}</p>
          )}
        </div>

        {/* Display Name */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="display-name" className="text-xs font-medium">
              Display Name
            </Label>
            <span className="text-[11px] text-muted-foreground">Max 60 chars</span>
          </div>
          <Input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, display_name: [] }));
            }}
            disabled={isPending}
            placeholder="Alex Rivera"
            maxLength={60}
            className="h-10"
          />
          {fieldErrors.display_name && (
            <p className="text-xs text-destructive">{fieldErrors.display_name[0]}</p>
          )}
        </div>

        {/* Headline */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="headline" className="text-xs font-medium">
              Headline
            </Label>
            <span className="text-[11px] text-muted-foreground">
              {headline.length}/120 chars
            </span>
          </div>
          <Input
            id="headline"
            type="text"
            value={headline}
            onChange={(e) => {
              setHeadline(e.target.value);
              setFieldErrors((prev) => ({ ...prev, headline: [] }));
            }}
            disabled={isPending}
            placeholder="e.g. AI Product Designer & Creative Technologist"
            maxLength={120}
            className="h-10"
          />
          {fieldErrors.headline && (
            <p className="text-xs text-destructive">{fieldErrors.headline[0]}</p>
          )}
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="bio" className="text-xs font-medium">
              Bio
            </Label>
            <span className="text-[11px] text-muted-foreground">
              {bio.length}/500 chars
            </span>
          </div>
          <Textarea
            id="bio"
            rows={4}
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              setFieldErrors((prev) => ({ ...prev, bio: [] }));
            }}
            disabled={isPending}
            placeholder="Tell creators and learners about the things you make and how you use AI tools."
            maxLength={500}
            className="resize-none"
          />
          {fieldErrors.bio && (
            <p className="text-xs text-destructive">{fieldErrors.bio[0]}</p>
          )}
        </div>

        {/* Website URL */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="website-url" className="text-xs font-medium">
              Website
            </Label>
            <span className="text-[11px] text-muted-foreground">https:// only</span>
          </div>
          <Input
            id="website-url"
            type="url"
            value={websiteUrl}
            onChange={(e) => {
              setWebsiteUrl(e.target.value);
              setFieldErrors((prev) => ({ ...prev, website_url: [] }));
            }}
            disabled={isPending}
            placeholder="https://yourportfolio.com"
            className="h-10"
          />
          {fieldErrors.website_url && (
            <p className="text-xs text-destructive">{fieldErrors.website_url[0]}</p>
          )}
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* Social Links Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Social Links
          </h2>
          <p className="text-xs text-muted-foreground">
            All links must start with https://
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ALLOWED_SOCIAL_PLATFORMS.map((platform) => (
            <div key={platform} className="flex flex-col gap-1">
              <Label htmlFor={`social-${platform}`} className="text-xs font-medium capitalize">
                {platform === "x" ? "X (Twitter)" : platform}
              </Label>
              <Input
                id={`social-${platform}`}
                type="url"
                value={socialLinks[platform] || ""}
                onChange={(e) => handleSocialChange(platform, e.target.value)}
                disabled={isPending}
                placeholder={`https://${platform === "x" ? "x.com" : platform + ".com"}/yourhandle`}
                className="h-9 text-xs"
              />
            </div>
          ))}
        </div>

        {fieldErrors.social_links && (
          <p className="text-xs text-destructive">{fieldErrors.social_links[0]}</p>
        )}
      </section>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="brand"
          disabled={
            isPending ||
            isCheckingUsername ||
            (usernameStatus !== null && !usernameStatus.available)
          }
          className="font-medium"
        >
          {isPending ? "Saving changes..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
