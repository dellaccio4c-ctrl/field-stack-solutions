-- ============================================================
-- 1. Per-employee trip picks (live/shared trip planning)
-- 2. Equipment registry with lifetime service history
-- ============================================================

-- ---------- Per-employee trip picks ----------
create table public.trip_picks (
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  pick text not null check (pick in ('yes', 'no', 'maybe')),
  updated_at timestamptz not null default now(),
  primary key (work_order_id, user_id)
);

alter table public.trip_picks enable row level security;

-- Anyone who can see the work order can see everyone's picks.
create policy trip_picks_select on public.trip_picks for select using (
  exists (select 1 from public.work_orders w where w.id = work_order_id)
);
-- You may only write your own picks.
create policy trip_picks_insert on public.trip_picks for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.work_orders w where w.id = work_order_id)
);
create policy trip_picks_update on public.trip_picks for update using (user_id = auth.uid());
create policy trip_picks_delete on public.trip_picks for delete using (user_id = auth.uid());

-- Live updates for the trip board.
alter publication supabase_realtime add table public.trip_picks;

-- ---------- Equipment registry ----------
create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  location_id uuid references public.locations(id),
  name text not null,                -- e.g. "Vacuum pump — Bay 2"
  category text,                     -- pump | pos | compressor | hvac | camera | other...
  brand text,
  model text,
  serial_number text,
  unit_number text,
  install_date date,
  warranty_expires date,
  status text not null default 'active' check (status in ('active', 'retired')),
  notes text,
  created_at timestamptz not null default now()
);

create index equipment_location_idx on public.equipment (location_id);
create index equipment_serial_idx on public.equipment (serial_number);

alter table public.equipment enable row level security;
create policy equipment_select on public.equipment for select using (public.current_rank() >= 1);
create policy equipment_write on public.equipment for all using (
  public.current_rank() >= 3 or public.is_xpress()
);

-- Tie work orders to equipment for lifetime service history.
alter table public.work_orders add column equipment_id uuid references public.equipment(id);
create index work_orders_equipment_idx on public.work_orders (equipment_id);
