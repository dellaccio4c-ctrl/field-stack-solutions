-- STEP 1 — run this line BY ITSELF first (enum values can't be added
-- in the same transaction that uses them):
--
--   alter type public.user_role add value 'xpress_pumping';
--
-- STEP 2 — then run everything below as a second query.

create or replace function public.role_rank(r public.user_role)
returns int language sql immutable as $$
  select case r
    when 'owner' then 5
    when 'admin' then 4
    when 'manager' then 3
    when 'field' then 2
    when 'xpress_pumping' then 2
    when 'readonly' then 1
    when 'customer' then 0
  end;
$$;

-- Map coordinates for pump sites.
alter table public.pump_sites
  add column lat double precision,
  add column lng double precision;

-- Pump sites: manager+ OR the Xpress Pumping role.
drop policy pump_sites_all on public.pump_sites;
create policy pump_sites_all on public.pump_sites for all using (
  public.current_rank() >= 3
  or exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'xpress_pumping' and is_active
  )
);
