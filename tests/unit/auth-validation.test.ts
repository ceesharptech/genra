import { describe, expect, it } from "vitest";
import {
  emailSchema,
  otpCodeSchema,
  usernameSchema,
  websiteUrlSchema,
  socialLinksSchema,
} from "@/lib/validation/auth";

describe("emailSchema", () => {
  it("accepts valid email addresses", () => {
    expect(emailSchema.safeParse("user@example.com").success).toBe(true);
    expect(emailSchema.safeParse("user.name+tag@sub.example.co.uk").success).toBe(
      true
    );
  });

  it("rejects invalid or empty emails", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
    expect(emailSchema.safeParse("invalid-email").success).toBe(false);
    expect(emailSchema.safeParse("@example.com").success).toBe(false);
  });
});

describe("otpCodeSchema", () => {
  it("accepts exactly 6 digits", () => {
    expect(otpCodeSchema.safeParse("123456").success).toBe(true);
    expect(otpCodeSchema.safeParse("000000").success).toBe(true);
  });

  it("rejects non-digit or wrong length inputs", () => {
    expect(otpCodeSchema.safeParse("12345").success).toBe(false);
    expect(otpCodeSchema.safeParse("1234567").success).toBe(false);
    expect(otpCodeSchema.safeParse("12345a").success).toBe(false);
    expect(otpCodeSchema.safeParse("abcdef").success).toBe(false);
  });
});

describe("usernameSchema", () => {
  it("accepts valid usernames", () => {
    expect(usernameSchema.safeParse("johndoe").success).toBe(true);
    expect(usernameSchema.safeParse("user_123").success).toBe(true);
    expect(usernameSchema.safeParse("ABC_def_456").success).toBe(true);
  });

  it("rejects usernames shorter than 3 or longer than 30 chars", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("a".repeat(31)).success).toBe(false);
  });

  it("rejects invalid characters", () => {
    expect(usernameSchema.safeParse("user-name").success).toBe(false);
    expect(usernameSchema.safeParse("user.name").success).toBe(false);
    expect(usernameSchema.safeParse("user name").success).toBe(false);
    expect(usernameSchema.safeParse("user@name").success).toBe(false);
  });

  it("rejects reserved usernames case-insensitively", () => {
    expect(usernameSchema.safeParse("admin").success).toBe(false);
    expect(usernameSchema.safeParse("Admin").success).toBe(false);
    expect(usernameSchema.safeParse("GENRA").success).toBe(false);
    expect(usernameSchema.safeParse("settings").success).toBe(false);
    expect(usernameSchema.safeParse("api").success).toBe(false);
    expect(usernameSchema.safeParse("null").success).toBe(false);
  });
});

describe("websiteUrlSchema", () => {
  it("accepts valid https URLs", () => {
    expect(websiteUrlSchema.safeParse("https://example.com").success).toBe(true);
    expect(
      websiteUrlSchema.safeParse("https://portfolio.me/showcase").success
    ).toBe(true);
    expect(websiteUrlSchema.safeParse("").success).toBe(true);
    expect(websiteUrlSchema.safeParse(null).success).toBe(true);
  });

  it("rejects non-https schemes and invalid URLs", () => {
    expect(websiteUrlSchema.safeParse("http://example.com").success).toBe(false);
    expect(websiteUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(websiteUrlSchema.safeParse("not a url").success).toBe(false);
  });
});

describe("socialLinksSchema", () => {
  it("accepts valid allowed social platforms with https URLs", () => {
    const valid = {
      github: "https://github.com/myuser",
      x: "https://x.com/myuser",
      linkedin: "https://linkedin.com/in/myuser",
    };
    expect(socialLinksSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects disallowed platforms", () => {
    const invalid = {
      facebook: "https://facebook.com/myuser",
    };
    expect(socialLinksSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects non-https URLs in social links", () => {
    const invalid = {
      github: "http://github.com/myuser",
    };
    expect(socialLinksSchema.safeParse(invalid).success).toBe(false);
  });
});
