import { describe, it, expect } from 'vitest';
import { validateProductionEnv } from '../../scripts/check-production-env.mjs';

const runValidate = (env: Record<string, string | undefined>) =>
  validateProductionEnv(env as unknown as NodeJS.ProcessEnv);

describe('validateProductionEnv', () => {
  it('skips validation when VERCEL_ENV is not production', () => {
    const result = runValidate({
      VERCEL_ENV: 'preview',
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    });
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it('skips validation when VERCEL_ENV is undefined (local dev)', () => {
    const result = runValidate({});
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it('fails in production when NEXT_PUBLIC_SITE_URL is missing', () => {
    const result = runValidate({
      VERCEL_ENV: 'production',
      NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefgh.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'valid-anon-key-12345',
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('NEXT_PUBLIC_SITE_URL is required in production.');
  });

  it('fails in production when NEXT_PUBLIC_SITE_URL uses http://', () => {
    const result = runValidate({
      VERCEL_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: 'http://genra.dev',
      NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefgh.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'valid-anon-key-12345',
    });
    expect(result.ok).toBe(false);
    expect(result.errors?.some((e) => e.includes('must use https://'))).toBe(true);
  });

  it('fails in production when NEXT_PUBLIC_SITE_URL is a vercel.app alias', () => {
    const result = runValidate({
      VERCEL_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: 'https://genra.vercel.app',
      NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefgh.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'valid-anon-key-12345',
    });
    expect(result.ok).toBe(false);
    expect(result.errors?.some((e) => e.includes('must not be a vercel.app alias'))).toBe(true);
  });

  it('fails in production when NEXT_PUBLIC_SITE_URL is localhost', () => {
    const result = runValidate({
      VERCEL_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: 'https://localhost:3000',
      NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefgh.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'valid-anon-key-12345',
    });
    expect(result.ok).toBe(false);
    expect(result.errors?.some((e) => e.includes('must not be localhost'))).toBe(true);
  });

  it('fails in production when Supabase URL is local or placeholder', () => {
    const result = runValidate({
      VERCEL_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: 'https://genra.dev',
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'valid-anon-key-12345',
    });
    expect(result.ok).toBe(false);
    expect(result.errors?.some((e) => e.toLowerCase().includes('supabase'))).toBe(true);
  });

  it('fails in production when Supabase anon key is missing or placeholder', () => {
    const result = runValidate({
      VERCEL_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: 'https://genra.dev',
      NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefgh.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder',
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or invalid in production.');
  });

  it('passes in production with valid HTTPS domain and real Supabase credentials', () => {
    const result = runValidate({
      VERCEL_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: 'https://genra.dev',
      NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefgh.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'valid-anon-key-abcdef123456',
    });
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(false);
  });
});
