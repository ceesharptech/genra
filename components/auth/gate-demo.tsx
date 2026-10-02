"use client";

import { useEffect } from "react";
import { AuthGate } from "./auth-modal-provider";
import { Button } from "@/components/ui/button";
import { registerIntent } from "@/lib/auth/intents";
import { toast } from "sonner";

export function GateDemo() {
  useEffect(() => {
    // Register the demo intent handler
    const unregister = registerIntent("demo", (targetType, targetId) => {
      toast.success(
        `Intent replayed successfully: demo:${targetType}:${targetId}`,
        {
          description: "Action resumed and completed after authentication.",
        }
      );
    });

    return () => {
      unregister();
    };
  }, []);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">
        Clicking this button while signed out will open the login modal and record the intent. After signing in, you will return here and the intent will fire once.
      </div>
      <div>
        <AuthGate
          action="demo"
          targetType="page"
          targetId="dev"
          message="Sign in to test the action gating primitive"
          onPerform={() => {
            toast.success("Action performed directly (already signed in)!");
          }}
        >
          {({ onClick }) => (
            <Button
              type="button"
              variant="brand"
              onClick={onClick}
              className="font-medium"
            >
              Test Gated Action (demo:page:dev)
            </Button>
          )}
        </AuthGate>
      </div>
    </div>
  );
}
