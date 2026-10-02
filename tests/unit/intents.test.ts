import { describe, expect, it, vi } from "vitest";
import {
  parseIntent,
  formatIntent,
  registerIntent,
  executeIntent,
} from "@/lib/auth/intents";

describe("intents", () => {
  describe("formatIntent", () => {
    it("formats action, targetType, and targetId into standard string", () => {
      expect(formatIntent("like", "creation", "123e4567-e89b-12d3-a456")).toBe(
        "like:creation:123e4567-e89b-12d3-a456"
      );
    });
  });

  describe("parseIntent", () => {
    it("parses valid intent strings", () => {
      const parsed = parseIntent("like:creation:abc-123_456");
      expect(parsed).toEqual({
        action: "like",
        targetType: "creation",
        targetId: "abc-123_456",
      });
    });

    it("rejects strings without exactly 3 colon-separated parts", () => {
      expect(parseIntent("like")).toBe(null);
      expect(parseIntent("like:creation")).toBe(null);
      expect(parseIntent("like:creation:id:extra")).toBe(null);
      expect(parseIntent("")).toBe(null);
      expect(parseIntent(null)).toBe(null);
      expect(parseIntent(undefined)).toBe(null);
    });

    it("rejects malicious or invalid characters in parts", () => {
      expect(parseIntent("like:creation:id;alert(1)")).toBe(null);
      expect(parseIntent("like:creation:id/path")).toBe(null);
      expect(parseIntent("like:creation:id<script>")).toBe(null);
      expect(parseIntent("like :creation:id")).toBe(null);
    });
  });

  describe("registerIntent and executeIntent", () => {
    it("executes registered handler and unregisters cleanly", async () => {
      const mockHandler = vi.fn();
      const unregister = registerIntent("testAction", mockHandler);

      const success = await executeIntent("testAction:user:42");
      expect(success).toBe(true);
      expect(mockHandler).toHaveBeenCalledWith("user", "42");

      unregister();
      const afterUnregister = await executeIntent("testAction:user:42");
      expect(afterUnregister).toBe(false);
    });

    it("returns false for unregistered action", async () => {
      const success = await executeIntent("unknownAction:item:99");
      expect(success).toBe(false);
    });

    it("returns false for malformed intent string", async () => {
      const success = await executeIntent("malformed");
      expect(success).toBe(false);
    });
  });
});
