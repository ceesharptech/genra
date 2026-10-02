"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./auth-provider";
import { executeIntent, parseIntent } from "@/lib/auth/intents";

export function IntentReplay() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const executedRef = useRef<Set<string>>(new Set());

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
