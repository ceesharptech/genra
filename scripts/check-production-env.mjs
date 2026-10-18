#!/usr/bin/env node

/**
 * Production environment guard.
 * Runs before build ONLY when VERCEL_ENV=production.
 * Fails with a clear message if production requirements are not met.
 * Prints NO secret values.
 */

export function validateProductionEnv(env = process.env) {
  const vercelEnv = env.VERCEL_ENV;
  if (vercelEnv !== 'production') {
    return {
      ok: true,
      skipped: true,
      reason: `VERCEL_ENV is "${vercelEnv || 'not set'}", skipping production checks.`,
    };
  }

  const errors = [];

  // 1. Validate NEXT_PUBLIC_SITE_URL
  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) {
    errors.push('NEXT_PUBLIC_SITE_URL is required in production.');
  } else {
    try {
      const parsed = new URL(siteUrl);
      if (parsed.protocol !== 'https:') {
        errors.push(`NEXT_PUBLIC_SITE_URL must use https:// in production. Found: "${parsed.protocol}"`);
      }
      if (parsed.hostname.endsWith('vercel.app')) {
        errors.push(`NEXT_PUBLIC_SITE_URL must not be a vercel.app alias in production. Found: "${parsed.hostname}"`);
      }
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        errors.push('NEXT_PUBLIC_SITE_URL must not be localhost or 127.0.0.1 in production.');
      }
    } catch {
      errors.push(`NEXT_PUBLIC_SITE_URL is not a valid URL: "${siteUrl}"`);
    }
  }

  // 2. Validate NEXT_PUBLIC_SUPABASE_URL
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required in production.');
  } else {
    try {
      const parsed = new URL(supabaseUrl);
      if (parsed.protocol !== 'https:') {
        errors.push(`NEXT_PUBLIC_SUPABASE_URL must use https://. Found: "${parsed.protocol}"`);
      }
      if (
        parsed.hostname.includes('localhost') ||
        parsed.hostname.includes('127.0.0.1') ||
        parsed.hostname.includes('placeholder') ||
        parsed.hostname.includes('example.com')
      ) {
        errors.push('NEXT_PUBLIC_SUPABASE_URL must not be a local or placeholder URL in production.');
      }
    } catch {
      errors.push('NEXT_PUBLIC_SUPABASE_URL is not a valid URL.');
    }
  }

  // 3. Validate NEXT_PUBLIC_SUPABASE_ANON_KEY presence without printing it
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!anonKey || anonKey === 'placeholder') {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or invalid in production.');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, skipped: false };
}

// CLI Execution (handles both Windows and POSIX paths)
const isDirectCli =
  process.argv[1] &&
  (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
    process.argv[1].endsWith('check-production-env.mjs'));

if (isDirectCli) {
  const result = validateProductionEnv(process.env);
  if (!result.ok) {
    console.error('\n❌ Production Environment Pre-Build Check FAILED:\n');
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    console.error('\nProduction builds require a valid HTTPS domain, real Supabase credentials, and non-placeholder settings.\n');
    process.exit(1);
  } else if (result.skipped) {
    console.log(`ℹ️ [check-production-env] ${result.reason}`);
    process.exit(0);
  } else {
    console.log('✅ [check-production-env] Production environment check passed.');
    process.exit(0);
  }
}
