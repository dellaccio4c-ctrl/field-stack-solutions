-- Service requests / leads submitted from the public marketing page.
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text not null,
  service text,
  message text,
  status text not null default 'new', -- new | contacted | converted | closed
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

-- Anyone (including anonymous visitors) may submit a lead.
create policy leads_insert on public.leads for insert with check (true);

-- Staff (field and up) can view; manager+ can update status.
create policy leads_select on public.leads for select using (public.current_rank() >= 2);
create policy leads_update on public.leads for update using (public.current_rank() >= 3);
create policy leads_delete on public.leads for delete using (public.current_rank() >= 4);
