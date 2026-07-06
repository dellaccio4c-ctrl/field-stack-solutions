-- Network module: internet circuits (setups/installs + what we bill = internet
-- sales) and network devices per site, plus a 'network' work order type.

alter table public.work_orders drop constraint work_orders_wo_type_check;
alter table public.work_orders add constraint work_orders_wo_type_check
  check (wo_type in ('service', 'preventative', 'pumping', 'install', 'inspection', 'network'));

create table public.network_circuits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  provider text not null,                -- ISP / carrier
  circuit_type text not null default 'fiber'
    check (circuit_type in ('fiber', 'cable', 'dsl', 'fixed_wireless', 'lte_5g', 'satellite', 'other')),
  download_mbps int,
  upload_mbps int,
  static_ip text,
  account_number text,
  status text not null default 'quoted'
    check (status in ('quoted', 'ordered', 'scheduled', 'installed', 'active', 'suspended', 'cancelled')),
  install_date date,
  monthly_cost numeric(10,2),            -- what we pay the carrier
  monthly_price numeric(10,2),           -- what we bill the customer (internet sales)
  notes text,
  created_at timestamptz not null default now()
);

create index network_circuits_location_idx on public.network_circuits (location_id);

alter table public.network_circuits enable row level security;
create policy network_circuits_select on public.network_circuits for select
  using (public.current_rank() >= 1);
create policy network_circuits_write on public.network_circuits for all
  using (public.current_rank() >= 3) with check (public.current_rank() >= 3);

create table public.network_devices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  circuit_id uuid references public.network_circuits(id) on delete set null,
  device_type text not null default 'other'
    check (device_type in ('router', 'firewall', 'switch', 'access_point', 'camera', 'nvr', 'controller', 'pos_terminal', 'modem', 'ups', 'other')),
  name text not null,
  brand text,
  model text,
  serial_number text,
  mac_address text,
  ip_address text,
  install_date date,
  status text not null default 'active' check (status in ('active', 'spare', 'retired')),
  notes text,
  created_at timestamptz not null default now()
);

create index network_devices_location_idx on public.network_devices (location_id);

alter table public.network_devices enable row level security;
create policy network_devices_select on public.network_devices for select
  using (public.current_rank() >= 1);
create policy network_devices_write on public.network_devices for all
  using (public.current_rank() >= 3) with check (public.current_rank() >= 3);
