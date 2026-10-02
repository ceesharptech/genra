"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Profile error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Could not load profile
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        We encountered an error loading this profile. Please try again.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => reset()}
        className="mt-4"
      >
        Try again
      </Button>
    </div>
  );
}
