import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/auth/redirect";

describe("safeRedirectPath", () => {
  it("allows valid same-site relative paths", () => {
    expect(safeRedirectPath("/")).toBe("/");
    expect(safeRedirectPath("/discover")).toBe("/discover");
    expect(safeRedirectPath("/c/my-creation")).toBe("/c/my-creation");
    expect(safeRedirectPath("/u/creator123")).toBe("/u/creator123");
    expect(safeRedirectPath("/settings")).toBe("/settings");
  });

  it("preserves query strings and fragments", () => {
    expect(
      safeRedirectPath("/c/my-slug?intent=like:creation:123#comments")
    ).toBe("/c/my-slug?intent=like:creation:123#comments");
    expect(safeRedirectPath("/discover?category=web-apps&sort=trending")).toBe(
      "/discover?category=web-apps&sort=trending"
    );
  });

  it("trims whitespace from valid paths", () => {
    expect(safeRedirectPath("  /discover  ")).toBe("/discover");
  });

  it("returns fallback for null, undefined, or empty strings", () => {
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath("")).toBe("/");
    expect(safeRedirectPath("   ")).toBe("/");
    expect(safeRedirectPath(null, "/fallback")).toBe("/fallback");
  });

  it("rejects absolute URLs with protocol", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/");
    expect(safeRedirectPath("http://evil.com/phish")).toBe("/");
    expect(safeRedirectPath("ftp://evil.com")).toBe("/");
    expect(safeRedirectPath("//evil.com")).toBe("/");
    expect(safeRedirectPath("///evil.com")).toBe("/");
  });

  it("rejects backslash tricks and encoded backslashes", () => {
    expect(safeRedirectPath("/\\evil.com")).toBe("/");
    expect(safeRedirectPath("/\\evil.com/path")).toBe("/");
    expect(safeRedirectPath("\\evil.com")).toBe("/");
    expect(safeRedirectPath("/%5cevil.com")).toBe("/");
    expect(safeRedirectPath("/%5Cevil.com")).toBe("/");
    expect(safeRedirectPath("/path/to\\target")).toBe("/");
  });

  it("rejects encoded protocol-relative slashes", () => {
    expect(safeRedirectPath("/%2fevil.com")).toBe("/");
    expect(safeRedirectPath("/%2Fevil.com")).toBe("/");
    expect(safeRedirectPath("/%2f%2fevil.com")).toBe("/");
  });

  it("rejects script and pseudo-protocol schemes", () => {
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
    expect(safeRedirectPath("/javascript:alert(1)")).toBe("/");
    expect(safeRedirectPath("/data:text/html,<script>alert(1)</script>")).toBe(
      "/"
    );
    expect(safeRedirectPath("/vbscript:msgbox(1)")).toBe("/");
  });

  it("rejects control characters", () => {
    expect(safeRedirectPath("/path\nwith\nnewlines")).toBe("/");
    expect(safeRedirectPath("/path\x00null")).toBe("/");
    expect(safeRedirectPath("/path\r\nreturn")).toBe("/");
  });
});
