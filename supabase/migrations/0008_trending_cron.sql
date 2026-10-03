-- 0008_trending_cron.sql
-- Phase 03: Enable pg_cron and schedule refresh_trending() every 15 minutes.

create extension if not exists pg_cron;

-- Remove existing job if already registered to make migration idempotent
do $$
begin
  if exists (select 1 from cron.job where jobname = 'refresh-trending') then
    perform cron.unschedule('refresh-trending');
  end if;
end $$;

-- Schedule refresh_trending() every 15 minutes
select cron.schedule('refresh-trending', '*/15 * * * *', 'select refresh_trending()');

-- Run refresh_trending() once on migration
select refresh_trending();
