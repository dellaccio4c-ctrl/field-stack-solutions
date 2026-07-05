-- ============================================================
-- Work Orders: on-site support with photos, timestamps,
-- time-to-complete, and trip planning.
-- ============================================================

create type public.wo_status as enum
  ('open', 'scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled');
create type public.wo_priority as enum
  ('low', 'normal', 'high', 'emergency');

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  number serial,
  title text not null,
  description text,
  status public.wo_status not null default 'open',
  priority public.wo_priority not null default 'normal',
  is_pumping boolean not null default false,

  customer_id uuid references public.customers(id),
  location_id uuid references public.locations(id),
  -- Denormalized service address (from the site or entered directly) so
  -- trip planning by state works even for ad-hoc addresses.
  address text,
  city text,
  state text,               -- two-letter code, e.g. 'SC'
  zip text,
  lat double precision,
  lng double precision,

  assigned_to uuid references public.profiles(id),
  scheduled_date date,
  scheduled_end date,

  -- Trip planner pick: yes / maybe / no (null = not reviewed)
  trip_pick text check (trip_pick in ('yes', 'no', 'maybe')),

  -- Time tracking (owner metric: time to complete)
  started_at timestamptz,
  completed_at timestamptz,
  minutes_on_site int,      -- optional manual entry on completion

  invoice_id uuid references public.invoices(id),
  estimate_id uuid references public.estimates(id),

  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index work_orders_state_idx on public.work_orders (state) where status in ('open', 'scheduled', 'on_hold');
create index work_orders_status_idx on public.work_orders (status);

-- Immutable, timestamped event log. Every meaningful change lands here.
create table public.work_order_events (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  actor uuid references public.profiles(id),
  kind text not null,       -- created | status | assigned | scheduled | note | photo | trip_pick
  detail text,
  created_at timestamptz not null default now()
);
create index wo_events_wo_idx on public.work_order_events (work_order_id, created_at);

create table public.work_order_photos (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  url text not null,
  caption text,
  taken_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- Automatic timestamps + event logging ----------
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
  if new.trip_pick is distinct from old.trip_pick and new.trip_pick is not null then
    insert into work_order_events (work_order_id, actor, kind, detail)
    values (new.id, auth.uid(), 'trip_pick', 'Trip pick: ' || new.trip_pick);
  end if;
  return new;
end;
$$;
create trigger trg_wo_log
  after insert or update on public.work_orders
  for each row execute function public.wo_log_changes();

-- ---------- Row-level security ----------
alter table public.work_orders enable row level security;
alter table public.work_order_events enable row level security;
alter table public.work_order_photos enable row level security;

-- See: staff (field+) see all; xpress sees pumping-tagged only.
create policy wo_select on public.work_orders for select using (
  (public.current_rank() >= 2 and not public.is_xpress())
  or (public.is_xpress() and is_pumping)
);
-- Create: manager+, or xpress creating pumping work orders.
create policy wo_insert on public.work_orders for insert with check (
  public.current_rank() >= 3
  or (public.is_xpress() and is_pumping)
);
-- Update: manager+, the assigned tech, or xpress on pumping orders.
create policy wo_update on public.work_orders for update using (
  public.current_rank() >= 3
  or assigned_to = auth.uid()
  or (public.is_xpress() and is_pumping)
);
create policy wo_delete on public.work_orders for delete using (public.current_rank() >= 4);

-- Events/photos follow the parent work order's visibility.
create policy wo_events_select on public.work_order_events for select using (
  exists (select 1 from public.work_orders w where w.id = work_order_id)
);
create policy wo_events_insert on public.work_order_events for insert with check (
  exists (select 1 from public.work_orders w where w.id = work_order_id)
);

create policy wo_photos_select on public.work_order_photos for select using (
  exists (select 1 from public.work_orders w where w.id = work_order_id)
);
create policy wo_photos_insert on public.work_order_photos for insert with check (
  exists (select 1 from public.work_orders w where w.id = work_order_id)
);
create policy wo_photos_delete on public.work_order_photos for delete using (
  public.current_rank() >= 3 or taken_by = auth.uid()
);

-- Photo storage bucket.
insert into storage.buckets (id, name, public) values ('work-orders', 'work-orders', true);
create policy wo_storage_insert on storage.objects for insert
  with check (bucket_id = 'work-orders' and public.current_rank() >= 2);
create policy wo_storage_select on storage.objects for select
  using (bucket_id = 'work-orders');
create policy wo_storage_delete on storage.objects for delete
  using (bucket_id = 'work-orders' and public.current_rank() >= 3);
