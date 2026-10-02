-- Migration: 0003_profile_onboarding
-- Description: Add onboarded_at to profiles to track onboarding completion

alter table profiles add column onboarded_at timestamptz;
