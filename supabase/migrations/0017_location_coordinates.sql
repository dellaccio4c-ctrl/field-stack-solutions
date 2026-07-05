-- Map coordinates for customer sites.
-- (Applied directly via Supabase MCP on 2026-07-05.)
alter table public.locations
  add column lat double precision,
  add column lng double precision;
