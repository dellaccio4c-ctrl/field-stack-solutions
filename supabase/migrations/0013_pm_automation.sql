-- PM automation: link auto-generated work orders to their sources,
-- and give equipment its own service interval.
-- (Applied directly via Supabase MCP on 2026-07-05.)

alter table public.work_orders add column pump_site_id uuid references public.pump_sites(id);
create index work_orders_pump_site_idx on public.work_orders (pump_site_id) where status in ('open','scheduled','in_progress','on_hold');

-- System-generated work orders have no human creator.
alter table public.work_orders alter column created_by drop not null;

alter table public.equipment
  add column pm_interval_months int,
  add column pm_window_days int not null default 14;
