-- QuickBooks Online connection state + sync tracking. Owner-only.
create table public.qbo_connection (
  id uuid primary key default gen_random_uuid(),
  realm_id text not null,               -- QBO company id
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  connected_by uuid references public.profiles(id),
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  last_error text
);

alter table public.qbo_connection enable row level security;
create policy qbo_connection_owner on public.qbo_connection for all
  using (public.current_rank() >= 5) with check (public.current_rank() >= 5);

-- Map FieldStack records to their QBO counterparts (idempotent sync).
create table public.qbo_links (
  id uuid primary key default gen_random_uuid(),
  entity text not null check (entity in ('customer', 'invoice', 'payment', 'expense')),
  local_id uuid not null,
  qbo_id text not null,
  synced_at timestamptz not null default now(),
  unique (entity, local_id)
);

alter table public.qbo_links enable row level security;
create policy qbo_links_owner on public.qbo_links for all
  using (public.current_rank() >= 5) with check (public.current_rank() >= 5);
