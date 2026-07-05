-- ============================================================
-- 1. Work order types (preventative maintenance, pumping, ...)
-- 2. Inventory management (tools, parts, computers)
-- ============================================================

-- ---------- Work order types ----------
alter table public.work_orders add column wo_type text not null default 'service'
  check (wo_type in ('service', 'preventative', 'pumping', 'install', 'inspection'));

-- Keep the pumping flag in sync with the type so existing
-- Xpress visibility rules keep working unchanged.
create or replace function public.wo_sync_pumping()
returns trigger language plpgsql as $$
begin
  new.is_pumping := (new.wo_type = 'pumping');
  return new;
end;
$$;
create trigger trg_wo_sync_pumping
  before insert or update of wo_type on public.work_orders
  for each row execute function public.wo_sync_pumping();

-- Migrate any existing pumping-flagged work orders.
update public.work_orders set wo_type = 'pumping' where is_pumping;

-- ---------- Inventory ----------
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'part'
    check (category in ('tool', 'part', 'computer', 'consumable', 'other')),
  sku text,                          -- part number / SKU
  brand text,
  model text,
  serial_number text,                -- for tools/computers
  quantity int not null default 0,
  min_quantity int not null default 0,   -- low-stock alert threshold
  unit_cost numeric(12,2),
  storage_location text,             -- e.g. "Warehouse shelf B3", "Truck 1"
  assigned_to uuid references public.profiles(id),  -- checked out to
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index inventory_sku_idx on public.inventory_items (sku);

-- Audited stock movements: every quantity change with who/why/when.
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  delta int not null,                -- +5 received, -2 used
  reason text,
  work_order_id uuid references public.work_orders(id),
  actor uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index inventory_movements_item_idx on public.inventory_movements (item_id, created_at);

alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

-- Staff (field+, incl. xpress) can see and use inventory; admin+ deletes.
create policy inventory_select on public.inventory_items for select using (public.current_rank() >= 1);
create policy inventory_write on public.inventory_items for insert with check (public.current_rank() >= 2);
create policy inventory_update on public.inventory_items for update using (public.current_rank() >= 2);
create policy inventory_delete on public.inventory_items for delete using (public.current_rank() >= 4);

create policy inv_moves_select on public.inventory_movements for select using (public.current_rank() >= 1);
create policy inv_moves_insert on public.inventory_movements for insert with check (public.current_rank() >= 2);
