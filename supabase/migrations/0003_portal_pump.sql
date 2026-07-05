-- Customer portal: customers may approve/decline their own sent estimates.
create policy estimates_customer_decide on public.estimates for update
  using (customer_id = public.current_customer_id() and status = 'sent')
  with check (customer_id = public.current_customer_id() and status in ('approved', 'declined'));

-- Pumping service routing & scheduling (Under Development tab).
create table public.pump_sites (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  site_label text,
  address text not null,
  interval_months int not null default 6,
  window_days int not null default 14, -- +/- days around the projected date
  last_pumped date,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.pump_sites enable row level security;
create policy pump_sites_all on public.pump_sites for all using (public.current_rank() >= 3);
