-- Time clock: techs clock in/out from their phone; entries feed timesheets
-- and (when tied to a work order) real labor hours for job costing.

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_order_id uuid references public.work_orders(id) on delete set null,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index time_entries_user_idx on public.time_entries (user_id, clock_in);

alter table public.time_entries enable row level security;
-- Everyone sees their own entries; managers+ see all.
create policy time_entries_select on public.time_entries for select
  using (user_id = auth.uid() or public.current_rank() >= 3);
-- You clock yourself in/out; managers+ can correct anyone's entries.
create policy time_entries_insert on public.time_entries for insert
  with check (user_id = auth.uid() and public.current_rank() >= 2);
create policy time_entries_update on public.time_entries for update
  using (user_id = auth.uid() or public.current_rank() >= 3);
create policy time_entries_delete on public.time_entries for delete
  using (public.current_rank() >= 3);
