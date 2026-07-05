-- FieldStack Solutions — initial schema
-- Role ladder: owner(5) > admin(4) > manager(3) > field(2) > readonly(1)
-- Customer portal users have role 'customer' (rank 0, scoped to their own customer record).

create type public.user_role as enum ('customer', 'readonly', 'field', 'manager', 'admin', 'owner');

create or replace function public.role_rank(r public.user_role)
returns int language sql immutable as $$
  select case r
    when 'owner' then 5
    when 'admin' then 4
    when 'manager' then 3
    when 'field' then 2
    when 'readonly' then 1
    when 'customer' then 0
  end;
$$;

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role public.user_role not null default 'readonly',
  customer_id uuid, -- set only for role 'customer'
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_rank()
returns int language sql stable security definer set search_path = public as $$
  select coalesce((select role_rank(role) from profiles where id = auth.uid() and is_active), -1);
$$;

create or replace function public.current_customer_id()
returns uuid language sql stable security definer set search_path = public as $$
  select customer_id from profiles where id = auth.uid() and is_active;
$$;

-- Role changes: enforced in the database, not just the UI.
-- 1. You can never change your own role.
-- 2. The actor's rank must be strictly higher than BOTH the target's current role and the new role.
create or replace function public.enforce_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is null then
      -- allow service-role/migration changes (no JWT context)
      return new;
    end if;
    if auth.uid() = new.id then
      raise exception 'You cannot change your own access level.';
    end if;
    if public.current_rank() <= public.role_rank(old.role)
       or public.current_rank() <= public.role_rank(new.role) then
      raise exception 'Only a user with a higher access level can change this role.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_role_change
  before update on public.profiles
  for each row execute function public.enforce_role_change();

-- Auto-create a profile when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Customers & locations ----------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  billing_address text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint fk_profiles_customer foreign key (customer_id) references public.customers(id) on delete set null;

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text not null,          -- e.g. "Main St Site"
  address text not null,
  city text, state text, zip text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Estimates ----------
create type public.estimate_status as enum ('draft', 'sent', 'approved', 'declined', 'expired');

create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  number serial,
  customer_id uuid not null references public.customers(id),
  location_id uuid references public.locations(id),
  status public.estimate_status not null default 'draft',
  title text not null default '',
  notes text,
  tax_rate numeric(5,4) not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  decided_at timestamptz
);

-- ---------- Invoices ----------
create type public.invoice_status as enum ('draft', 'sent', 'partially_paid', 'paid', 'void', 'overdue');

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number serial,
  customer_id uuid not null references public.customers(id),
  location_id uuid references public.locations(id),
  estimate_id uuid references public.estimates(id),
  status public.invoice_status not null default 'draft',
  title text not null default '',
  notes text,
  tax_rate numeric(5,4) not null default 0,
  due_date date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- Line items shared by estimates and invoices (exactly one parent set).
create table public.line_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references public.estimates(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  sort_order int not null default 0,
  constraint one_parent check (num_nonnulls(estimate_id, invoice_id) = 1)
);

-- Saved products/services for quick line-item entry.
create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  unit_price numeric(12,2) not null default 0,
  is_active boolean not null default true
);

-- ---------- Money in / money out (owner-only visibility) ----------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id),
  amount numeric(12,2) not null,
  method text not null default 'other', -- card | ach | check | cash | other
  stripe_payment_intent_id text,
  received_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12,2) not null,
  category text,
  vendor text,
  customer_id uuid references public.customers(id),
  location_id uuid references public.locations(id),
  incurred_by uuid references public.profiles(id),
  incurred_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------- Row-Level Security ----------
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.locations enable row level security;
alter table public.estimates enable row level security;
alter table public.invoices enable row level security;
alter table public.line_items enable row level security;
alter table public.catalog_items enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

-- Profiles: see yourself; staff (field+) see all staff; admins+ manage.
create policy profiles_select on public.profiles for select using (
  id = auth.uid() or public.current_rank() >= 2
);
create policy profiles_update on public.profiles for update using (
  id = auth.uid() or public.current_rank() >= 4
);
create policy profiles_insert on public.profiles for insert with check (
  public.current_rank() >= 4
);

-- Customers/locations: staff read; manager+ write; customer users see only their own.
create policy customers_select on public.customers for select using (
  public.current_rank() >= 1 or id = public.current_customer_id()
);
create policy customers_write on public.customers for all using (public.current_rank() >= 3);

create policy locations_select on public.locations for select using (
  public.current_rank() >= 1 or customer_id = public.current_customer_id()
);
create policy locations_write on public.locations for all using (public.current_rank() >= 3);

-- Estimates/invoices: staff read; manager+ write; customers see their own (non-draft).
create policy estimates_select on public.estimates for select using (
  public.current_rank() >= 1
  or (customer_id = public.current_customer_id() and status <> 'draft')
);
create policy estimates_write on public.estimates for all using (public.current_rank() >= 3);

create policy invoices_select on public.invoices for select using (
  public.current_rank() >= 1
  or (customer_id = public.current_customer_id() and status <> 'draft')
);
create policy invoices_write on public.invoices for all using (public.current_rank() >= 3);

create policy line_items_select on public.line_items for select using (
  public.current_rank() >= 1
  or exists (select 1 from public.invoices i where i.id = invoice_id and i.customer_id = public.current_customer_id() and i.status <> 'draft')
  or exists (select 1 from public.estimates e where e.id = estimate_id and e.customer_id = public.current_customer_id() and e.status <> 'draft')
);
create policy line_items_write on public.line_items for all using (public.current_rank() >= 3);

create policy catalog_select on public.catalog_items for select using (public.current_rank() >= 1);
create policy catalog_write on public.catalog_items for all using (public.current_rank() >= 3);

-- Payments: owners see all. Customers see payments on their own invoices. Managers may record.
create policy payments_select on public.payments for select using (
  public.current_rank() >= 5
  or exists (select 1 from public.invoices i where i.id = invoice_id and i.customer_id = public.current_customer_id())
);
create policy payments_insert on public.payments for insert with check (public.current_rank() >= 3);
create policy payments_update on public.payments for update using (public.current_rank() >= 5);
create policy payments_delete on public.payments for delete using (public.current_rank() >= 5);

-- Expenses: owner-only.
create policy expenses_all on public.expenses for all using (public.current_rank() >= 5);
