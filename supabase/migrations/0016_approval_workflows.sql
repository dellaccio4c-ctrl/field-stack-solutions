-- Company-wide settings (single row) + estimate approval workflow.
-- (Applied directly via Supabase MCP on 2026-07-05.)
create table public.company_settings (
  id boolean primary key default true check (id),
  estimate_approval_threshold numeric(12,2),
  updated_at timestamptz not null default now()
);
insert into public.company_settings (id) values (true);

alter table public.company_settings enable row level security;
create policy settings_read on public.company_settings for select using (public.current_rank() >= 1);
create policy settings_write on public.company_settings for update using (public.current_rank() >= 5);

alter table public.estimates
  add column approval_status text not null default 'not_required'
    check (approval_status in ('not_required', 'pending', 'approved')),
  add column approved_by uuid references public.profiles(id),
  add column approved_at timestamptz;
