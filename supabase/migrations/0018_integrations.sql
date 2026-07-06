-- Sales-system integrations (NXT, Storage 360, Sonny's Controls POS, custom REST)
-- and the external sales records they sync in. Owner-only: connections hold API keys.

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('sonnys_controls', 'nxt', 'storage360', 'custom')),
  name text not null,
  api_base_url text,
  api_key text,
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'error')),
  last_sync_at timestamptz,
  last_error text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.integrations enable row level security;
create policy integrations_owner on public.integrations for all
  using (public.current_rank() >= 5) with check (public.current_rank() >= 5);

create table public.external_sales (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations(id) on delete cascade,
  external_id text not null,
  occurred_on date not null,
  description text,
  category text,
  amount numeric(12,2) not null,
  location_id uuid references public.locations(id) on delete set null,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (integration_id, external_id)
);

create index external_sales_occurred_idx on public.external_sales (occurred_on);

alter table public.external_sales enable row level security;
create policy external_sales_owner on public.external_sales for all
  using (public.current_rank() >= 5) with check (public.current_rank() >= 5);
