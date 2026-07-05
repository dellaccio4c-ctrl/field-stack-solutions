-- Job costing: per-employee labor cost rate (admin-managed).
-- (Applied directly via Supabase MCP on 2026-07-05.)
alter table public.profiles add column hourly_cost numeric(8,2);

create or replace function public.enforce_employee_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and public.current_rank() < 4 then
    if new.employee_code is distinct from old.employee_code
       or new.job_title is distinct from old.job_title
       or new.territory is distinct from old.territory
       or new.hire_date is distinct from old.hire_date
       or new.notes is distinct from old.notes
       or new.legal_first_name is distinct from old.legal_first_name
       or new.legal_last_name is distinct from old.legal_last_name
       or new.full_name is distinct from old.full_name
       or new.hourly_cost is distinct from old.hourly_cost then
      raise exception 'This field can only be changed by an Admin or Owner.';
    end if;
  end if;
  return new;
end;
$$;
