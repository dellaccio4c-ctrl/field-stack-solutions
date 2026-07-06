-- Vendor Parts & Pricing: multi-vendor parts catalog feeding estimates.
-- Costs are internal; estimates use cost * (1 + markup).

create table public.vendor_parts (
  id uuid primary key default gen_random_uuid(),
  vendor text not null,                 -- Grainger, Home Depot, Ferguson, Sonny's...
  sku text not null,                    -- vendor item / part number
  name text not null,
  description text,
  category text,
  brand text,
  unit text default 'each',
  cost numeric(12,2),                   -- what we pay (null = price unknown yet)
  url text,
  last_checked date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (vendor, sku)
);

create index vendor_parts_name_idx on public.vendor_parts using gin (to_tsvector('english', name || ' ' || coalesce(description, '')));
create index vendor_parts_vendor_idx on public.vendor_parts (vendor);

alter table public.vendor_parts enable row level security;
create policy vendor_parts_select on public.vendor_parts for select using (public.current_rank() >= 1);
create policy vendor_parts_write on public.vendor_parts for all
  using (public.current_rank() >= 3) with check (public.current_rank() >= 3);

-- Default markup applied when quoting parts on estimates (owner-editable).
alter table public.company_settings add column parts_markup_percent numeric(5,2) not null default 35;
