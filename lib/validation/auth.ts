import { z } from "zod";

export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "genra",
  "support",
  "help",
  "api",
  "login",
  "logout",
  "signin",
  "signup",
  "signout",
  "settings",
  "new",
  "onboarding",
  "auth",
  "null",
  "undefined",
  "system",
  "root",
  "explore",
  "discover",
  "search",
  "categories",
  "tools",
  "prompts",
  "resources",
  "collections",
  "saved",
  "dashboard",
  "terms",
  "privacy",
  "about",
]);

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Code must be exactly 6 digits");

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username can only contain letters, numbers, and underscores"
  )
  .refine(
    (val) => !RESERVED_USERNAMES.has(val.toLowerCase()),
    "This username is reserved and cannot be used"
  );

export const displayNameSchema = z
  .string()
  .trim()
  .max(60, "Display name must be at most 60 characters")
  .optional()
  .nullable();

export const headlineSchema = z
  .string()
  .trim()
  .max(120, "Headline must be at most 120 characters")
  .optional()
  .nullable();

export const bioSchema = z
  .string()
  .trim()
  .max(500, "Bio must be at most 500 characters")
  .optional()
  .nullable();

export const websiteUrlSchema = z
  .string()
  .trim()
  .max(255, "Website URL is too long")
  .refine(
    (val) => !val || (val.startsWith("https://") && z.string().url().safeParse(val).success),
    "Website URL must be a valid URL starting with https://"
  )
  .optional()
  .nullable();

export const ALLOWED_SOCIAL_PLATFORMS = [
  "github",
  "x",
  "linkedin",
  "youtube",
  "instagram",
  "dribbble",
] as const;

export type SocialPlatform = (typeof ALLOWED_SOCIAL_PLATFORMS)[number];

export const socialLinksSchema = z
  .record(z.string(), z.string().optional())
  .refine((obj) => {
    for (const key of Object.keys(obj)) {
      if (!ALLOWED_SOCIAL_PLATFORMS.includes(key as SocialPlatform)) {
        return false;
      }
      const val = obj[key]?.trim();
      if (val) {
        if (!val.startsWith("https://") || !z.string().url().safeParse(val).success) {
          return false;
        }
      }
    }
    return true;
  }, "Social links must only include allowed platforms and start with https://");

export const profileUpdateSchema = z.object({
  username: usernameSchema,
  display_name: displayNameSchema,
  headline: headlineSchema,
  bio: bioSchema,
  website_url: websiteUrlSchema,
  social_links: socialLinksSchema.optional().default({}),
});

export const onboardingSchema = z.object({
  username: usernameSchema,
  display_name: displayNameSchema,
  avatar_url: z.string().url().optional().nullable(),
});
