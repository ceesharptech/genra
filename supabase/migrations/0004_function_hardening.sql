-- Migration: 0004_function_hardening
-- Description: Pin search_path on functions and revoke direct execute on internal trigger functions

-- 1. Pin search_path = public on functions flagged by security advisor
alter function public.set_updated_at() set search_path = public;
alter function public.search_creations(text, text, text[], text, integer, integer) set search_path = public;
alter function public.search_prompts(text, integer) set search_path = public;
alter function public.search_resources(text, resource_kind, integer) set search_path = public;

-- 2. Revoke execute on internal trigger and maintenance functions from untrusted roles
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.bump_engagement_count() from public, anon, authenticated;
revoke execute on function public.bump_comment_count() from public, anon, authenticated;
revoke execute on function public.refresh_trending() from public, anon, authenticated;
