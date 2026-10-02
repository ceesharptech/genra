import { describe, expect, it } from "vitest";
import {
  AuthRequiredError,
  OnboardingRequiredError,
  actionSuccess,
  actionError,
} from "@/lib/auth/types";

describe("auth types and helpers", () => {
  it("instantiates AuthRequiredError with expected name and message", () => {
    const err = new AuthRequiredError();
    expect(err.name).toBe("AuthRequiredError");
    expect(err.message).toBe("Authentication required");

    const customErr = new AuthRequiredError("Custom auth error");
    expect(customErr.message).toBe("Custom auth error");
  });

  it("instantiates OnboardingRequiredError with expected name and message", () => {
    const err = new OnboardingRequiredError();
    expect(err.name).toBe("OnboardingRequiredError");
    expect(err.message).toBe("Onboarding required");
  });

  it("creates successful ActionResult", () => {
    const res = actionSuccess({ id: "123", name: "test" });
    expect(res).toEqual({
      ok: true,
      data: { id: "123", name: "test" },
    });

    const voidRes = actionSuccess();
    expect(voidRes.ok).toBe(true);
  });

  it("creates failed ActionResult with optional fieldErrors", () => {
    const errRes = actionError("Invalid input", {
      username: ["Too short"],
    });
    expect(errRes).toEqual({
      ok: false,
      error: "Invalid input",
      fieldErrors: {
        username: ["Too short"],
      },
    });
  });
});
