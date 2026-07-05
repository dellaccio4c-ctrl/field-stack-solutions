-- ============================================================
-- FieldStack CATCH-UP script (2026-07-05)
-- Brings the database fully up to date with migrations
-- 0004, 0006, 0010, 0011, 0012. Safe to run more than once.
-- ============================================================

-- ---------- 0004: catalog photos ----------
alter table public.catalog_items add column if not exists image_url text;

insert into storage.buckets (id, name, public) values ('catalog', 'catalog', true)
on conflict (id) do nothing;

drop policy if exists catalog_images_insert on storage.objects;
drop policy if exists catalog_images_update on storage.objects;
drop policy if exists catalog_images_delete on storage.objects;
drop policy if exists catalog_images_select on storage.objects;
create policy catalog_images_insert on storage.objects for insert
  with check (bucket_id = 'catalog' and public.current_rank() >= 3);
create policy catalog_images_update on storage.objects for update
  using (bucket_id = 'catalog' and public.current_rank() >= 3);
create policy catalog_images_delete on storage.objects for delete
  using (bucket_id = 'catalog' and public.current_rank() >= 3);
create policy catalog_images_select on storage.objects for select
  using (bucket_id = 'catalog');

-- ---------- 0006: employee fields ----------
alter table public.profiles
  add column if not exists employee_code text,
  add column if not exists job_title text,
  add column if not exists phone text,
  add column if not exists territory text,
  add column if not exists hire_date date,
  add column if not exists notes text;

create unique index if not exists profiles_employee_code_unique
  on public.profiles (employee_code) where employee_code is not null;

create or replace function public.enforce_employee_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and public.current_rank() < 4 then
    if new.employee_code is distinct from old.employee_code
       or new.job_title is distinct from old.job_title
       or new.territory is distinct from old.territory
       or new.hire_date is distinct from old.hire_date
       or new.notes is distinct from old.notes
       or new.legal_first_name is distinct from old.legal_first_name
       or new.legal_last_name is distinct from old.legal_last_name
       or new.full_name is distinct from old.full_name then
      raise exception 'This field can only be changed by an Admin or Owner.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_employee_fields on public.profiles;
create trigger trg_profiles_employee_fields
  before update on public.profiles
  for each row execute function public.enforce_employee_fields();

-- ---------- 0010: work orders ----------
do $$ begin
  create type public.wo_status as enum
    ('open', 'scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.wo_priority as enum ('low', 'normal', 'high', 'emergency');
exception when duplicate_object then null; end $$;

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  number serial,
  title text not null,
  description text,
  status public.wo_status not null default 'open',
  priority public.wo_priority not null default 'normal',
  is_pumping boolean not null default false,
  customer_id uuid references public.customers(id),
  location_id uuid references public.locations(id),
  address text,
  city text,
  state text,
  zip text,
  lat double precision,
  lng double precision,
  assigned_to uuid references public.profiles(id),
  scheduled_date date,
  scheduled_end date,
  trip_pick text check (trip_pick in ('yes', 'no', 'maybe')),
  started_at timestamptz,
  completed_at timestamptz,
  minutes_on_site int,
  invoice_id uuid references public.invoices(id),
  estimate_id uuid references public.estimates(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_orders_state_idx on public.work_orders (state) where status in ('open', 'scheduled', 'on_hold');
create index if not exists work_orders_status_idx on public.work_orders (status);

create table if not exists public.work_order_events (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  actor uuid references public.profiles(id),
  kind text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists wo_events_wo_idx on public.work_order_events (work_order_id, created_at);

create table if not exists public.work_order_photos (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  url text not null,
  caption text,
  taken_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create or replace function public.wo_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'in_progress' and old.status <> 'in_progress' and new.started_at is null then
    new.started_at := now();
  end if;
  if new.status = 'completed' and old.status <> 'completed' and new.completed_at is null then
    new.completed_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists trg_wo_before_update on public.work_orders;
create trigger trg_wo_before_update
  before update on public.work_orders
  for each row execute function public.wo_before_update();

create or replace function public.wo_log_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into work_order_events (work_order_id, actor, kind, detail)
    values (new.id, auth.uid(), 'created', 'Work order created');
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into work_order_events (work_order_id, actor, kind, detail)
    values (new.id, auth.uid(), 'status', old.status || ' → ' || new.status);
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into work_order_events (work_order_id, actor, kind, detail)
    values (new.id, auth.uid(), 'assigned',
      coalesce((select coalesce(nullif(preferred_name, ''), full_name) from profiles where id = new.assigned_to), 'Unassigned'));
  end if;
  if new.scheduled_date is distinct from old.scheduled_date
     or new.scheduled_end is distinct from old.scheduled_end then
    insert into work_order_events (work_order_id, actor, kind, detail)
    values (new.id, auth.uid(), 'scheduled',
      coalesce(new.scheduled_date::text, 'unscheduled')
      || coalesce(' – ' || new.scheduled_end::text, ''));
  end if;
  return new;
end;
$$;
drop trigger if exists trg_wo_log on public.work_orders;
create trigger trg_wo_log
  after insert or update on public.work_orders
  for each row execute function public.wo_log_changes();

alter table public.work_orders enable row level security;
alter table public.work_order_events enable row level security;
alter table public.work_order_photos enable row level security;

drop policy if exists wo_select on public.work_orders;
create policy wo_select on public.work_orders for select using (
  (public.current_rank() >= 2 and not public.is_xpress())
  or (public.is_xpress() and is_pumping)
);
drop policy if exists wo_insert on public.work_orders;
create policy wo_insert on public.work_orders for insert with check (
  public.current_rank() >= 3
  or (public.is_xpress() and is_pumping)
);
drop policy if exists wo_update on public.work_orders;
create policy wo_update on public.work_orders for update using (
  public.current_rank() >= 3
  or assigned_to = auth.uid()
  or (public.is_xpress() and is_pumping)
);
drop policy if exists wo_delete on public.work_orders;
create policy wo_delete on public.work_orders for delete using (public.current_rank() >= 4);

drop policy if exists wo_events_select on public.work_order_events;
create policy wo_events_select on public.work_order_events for select using (
  exists (select 1 from public.work_orders w where w.id = work_order_id)
);
drop policy if exists wo_events_insert on public.work_order_events;
create policy wo_events_insert on public.work_order_events for insert with check (
  exists (select 1 from public.work_orders w where w.id = work_order_id)
);

drop policy if exists wo_photos_select on public.work_order_photos;
create policy wo_photos_select on public.work_order_photos for select using (
  exists (select 1 from public.work_orders w where w.id = work_order_id)
);
drop policy if exists wo_photos_insert on public.work_order_photos;
create policy wo_photos_insert on public.work_order_photos for insert with check (
  exists (select 1 from public.work_orders w where w.id = work_order_id)
);
drop policy if exists wo_photos_delete on public.work_order_photos;
create policy wo_photos_delete on public.work_order_photos for delete using (
  public.current_rank() >= 3 or taken_by = auth.uid()
);

insert into storage.buckets (id, name, public) values ('work-orders', 'work-orders', true)
on conflict (id) do nothing;
drop policy if exists wo_storage_insert on storage.objects;
drop policy if exists wo_storage_select on storage.objects;
drop policy if exists wo_storage_delete on storage.objects;
create policy wo_storage_insert on storage.objects for insert
  with check (bucket_id = 'work-orders' and public.current_rank() >= 2);
create policy wo_storage_select on storage.objects for select
  using (bucket_id = 'work-orders');
create policy wo_storage_delete on storage.objects for delete
  using (bucket_id = 'work-orders' and public.current_rank() >= 3);

-- ---------- 0011: trip picks + equipment ----------
create table if not exists public.trip_picks (
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  pick text not null check (pick in ('yes', 'no', 'maybe')),
  updated_at timestamptz not null default now(),
  primary key (work_order_id, user_id)
);

alter table public.trip_picks enable row level security;
drop policy if exists trip_picks_select on public.trip_picks;
create policy trip_picks_select on public.trip_picks for select using (
  exists (select 1 from public.work_orders w where w.id = work_order_id)
);
drop policy if exists trip_picks_insert on public.trip_picks;
create policy trip_picks_insert on public.trip_picks for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.work_orders w where w.id = work_order_id)
);
drop policy if exists trip_picks_update on public.trip_picks;
create policy trip_picks_update on public.trip_picks for update using (user_id = auth.uid());
drop policy if exists trip_picks_delete on public.trip_picks;
create policy trip_picks_delete on public.trip_picks for delete using (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.trip_picks;
exception when duplicate_object then null; end $$;

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  location_id uuid references public.locations(id),
  name text not null,
  category text,
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
create index if not exists equipment_location_idx on public.equipment (location_id);
create index if not exists equipment_serial_idx on public.equipment (serial_number);

alter table public.equipment enable row level security;
drop policy if exists equipment_select on public.equipment;
create policy equipment_select on public.equipment for select using (public.current_rank() >= 1);
drop policy if exists equipment_write on public.equipment;
create policy equipment_write on public.equipment for all using (
  public.current_rank() >= 3 or public.is_xpress()
);

alter table public.work_orders add column if not exists equipment_id uuid references public.equipment(id);
create index if not exists work_orders_equipment_idx on public.work_orders (equipment_id);

-- ---------- 0012: WO types + inventory ----------
alter table public.work_orders add column if not exists wo_type text not null default 'service';
do $$ begin
  alter table public.work_orders add constraint work_orders_wo_type_check
    check (wo_type in ('service', 'preventative', 'pumping', 'install', 'inspection'));
exception when duplicate_object then null; end $$;

create or replace function public.wo_sync_pumping()
returns trigger language plpgsql as $$
begin
  new.is_pumping := (new.wo_type = 'pumping');
  return new;
end;
$$;
drop trigger if exists trg_wo_sync_pumping on public.work_orders;
create trigger trg_wo_sync_pumping
  before insert or update of wo_type on public.work_orders
  for each row execute function public.wo_sync_pumping();

update public.work_orders set wo_type = 'pumping' where is_pumping and wo_type = 'service';

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'part'
    check (category in ('tool', 'part', 'computer', 'consumable', 'other')),
  sku text,
  brand text,
  model text,
  serial_number text,
  quantity int not null default 0,
  min_quantity int not null default 0,
  unit_cost numeric(12,2),
  storage_location text,
  assigned_to uuid references public.profiles(id),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists inventory_sku_idx on public.inventory_items (sku);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  delta int not null,
  reason text,
  work_order_id uuid references public.work_orders(id),
  actor uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists inventory_movements_item_idx on public.inventory_movements (item_id, created_at);

alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

drop policy if exists inventory_select on public.inventory_items;
create policy inventory_select on public.inventory_items for select using (public.current_rank() >= 1);
drop policy if exists inventory_write on public.inventory_items;
create policy inventory_write on public.inventory_items for insert with check (public.current_rank() >= 2);
drop policy if exists inventory_update on public.inventory_items;
create policy inventory_update on public.inventory_items for update using (public.current_rank() >= 2);
drop policy if exists inventory_delete on public.inventory_items;
create policy inventory_delete on public.inventory_items for delete using (public.current_rank() >= 4);

drop policy if exists inv_moves_select on public.inventory_movements;
create policy inv_moves_select on public.inventory_movements for select using (public.current_rank() >= 1);
drop policy if exists inv_moves_insert on public.inventory_movements;
create policy inv_moves_insert on public.inventory_movements for insert with check (public.current_rank() >= 2);
