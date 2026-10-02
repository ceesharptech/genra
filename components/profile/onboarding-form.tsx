"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  checkUsernameAvailability,
  completeOnboardingAction,
} from "@/lib/profile/actions";
import { usernameSchema, displayNameSchema } from "@/lib/validation/auth";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

interface OnboardingFormProps {
  userId: string;
  initialUsername: string;
  initialDisplayName?: string | null;
  initialAvatarUrl?: string | null;
  next?: string;
}

export function OnboardingForm({
  userId,
  initialUsername,
  initialDisplayName,
  initialAvatarUrl,
  next = "/",
}: OnboardingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    initialAvatarUrl || null
  );

  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{
    available: boolean;
    message?: string;
  } | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Debounced username availability check
  useEffect(() => {
    const trimmed = username.trim();
    const timer = setTimeout(async () => {
      if (!trimmed) {
        setUsernameStatus(null);
        setIsCheckingUsername(false);
        return;
      }

      // Local validation first
      const localValidation = usernameSchema.safeParse(trimmed);
      if (!localValidation.success) {
        setUsernameStatus({
          available: false,
          message: localValidation.error.issues[0]?.message,
        });
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
  }, [username]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const trimmedUser = username.trim();
    const userCheck = usernameSchema.safeParse(trimmedUser);
    if (!userCheck.success) {
      setFieldErrors({ username: [userCheck.error.issues[0]?.message || "Invalid username"] });
      return;
    }

    const dispCheck = displayNameSchema.safeParse(displayName);
    if (!dispCheck.success) {
      setFieldErrors({ display_name: [dispCheck.error.issues[0]?.message || "Invalid display name"] });
      return;
    }

    startTransition(async () => {
      const res = await completeOnboardingAction({
        username: trimmedUser,
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl,
      });

      if (!res.ok) {
        setFormError(res.error);
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
        return;
      }

      // Successful onboarding: redirect to safe next or the newly created profile page
      const target = next && next !== "/" ? next : `/u/${res.data.username}`;
      router.replace(target);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {formError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
        >
          {formError}
        </div>
      )}

      {/* Avatar upload section */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Profile Photo (optional)
        </Label>
        <AvatarUpload
          userId={userId}
          currentAvatarUrl={avatarUrl}
          onAvatarUploaded={(url) => setAvatarUrl(url)}
          disabled={isPending}
        />
      </div>

      {/* Username section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Username <span className="text-destructive">*</span>
          </Label>
          <span className="text-[11px] text-muted-foreground">3–30 characters</span>
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
            placeholder="your_handle"
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

      {/* Display name section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="display-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Display Name
          </Label>
          <span className="text-[11px] text-muted-foreground">Up to 60 characters</span>
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
          placeholder="e.g. Alex Rivera"
          maxLength={60}
          className="h-10"
        />

        {fieldErrors.display_name && (
          <p className="text-xs text-destructive">{fieldErrors.display_name[0]}</p>
        )}
      </div>

      <Button
        type="submit"
        variant="brand"
        loading={isPending}
        disabled={
          isCheckingUsername ||
          (usernameStatus !== null && !usernameStatus.available) ||
          !username.trim()
        }
        className="mt-2 h-10 w-full font-medium"
      >
        Complete Setup
      </Button>
    </form>
  );
}
