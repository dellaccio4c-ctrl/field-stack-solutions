-- Automated follow-up tracking for unapproved estimates.
-- (Applied directly via Supabase MCP on 2026-07-05.)
alter table public.estimates
  add column follow_up_count int not null default 0,
  add column last_follow_up_at timestamptz;
