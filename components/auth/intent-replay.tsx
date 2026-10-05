"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./auth-provider";
import { executeIntent, parseIntent, registerIntent } from "@/lib/auth/intents";
import { setLikeAction, setSaveAction } from "@/lib/engagement/actions";
import type { EngagementTargetType } from "@/lib/validation/engagement";
import { toast } from "sonner";

export function IntentReplay() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const executedRef = useRef<Set<string>>(new Set());

  // Register engagement intent handlers on mount
  useEffect(() => {
    const unregisterLike = registerIntent("like", async (targetType, targetId) => {
      const res = await setLikeAction(targetType as EngagementTargetType, targetId, true);
      if (res.ok) {
        toast.success("Liked");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to like");
      }
    });

    const unregisterSave = registerIntent("save", async (targetType, targetId) => {
      const res = await setSaveAction(targetType as EngagementTargetType, targetId, true);
      if (res.ok) {
        toast.success("Saved");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to save");
      }
    });

    const unregisterCopy = registerIntent("copy", (_targetType, targetId) => {
      const el = document.getElementById(`prompt-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const copyBtn = el.querySelector<HTMLButtonElement>("button[data-copy-button]");
        if (copyBtn) {
          copyBtn.focus();
        }
      }
      toast.info("You're signed in. Press Copy to copy the prompt.");
    });

    return () => {
      unregisterLike();
      unregisterSave();
      unregisterCopy();
    };
  }, [router]);

  useEffect(() => {
    // Only replay intents when user is signed in
    if (!user) return;

    const rawIntent = searchParams.get("intent");
    if (!rawIntent) return;

    // Strict Mode / re-render guard: execute each unique intent string exactly once
    if (executedRef.current.has(rawIntent)) return;

    const parsed = parseIntent(rawIntent);
    if (!parsed) {
      // Malformed intent: silently remove param
      cleanUrlIntent();
      return;
    }

    executedRef.current.add(rawIntent);

    // Execute the registered intent handler
    executeIntent(rawIntent).finally(() => {
      cleanUrlIntent();
    });

    function cleanUrlIntent() {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      url.searchParams.delete("intent");
      const cleanPath = url.pathname + url.search + url.hash;
      router.replace(cleanPath, { scroll: false });
    }
  }, [user, searchParams, router]);

  return null;
}
