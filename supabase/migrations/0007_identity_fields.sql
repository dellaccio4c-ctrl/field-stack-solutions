-- Identity split: legal names (admin-controlled) vs preferred name (self-service).
alter table public.profiles
  add column legal_first_name text,
  add column legal_last_name text,
  add column preferred_name text,
  add column personal_email text;

-- Self-service users (below admin, including customers) may only change:
-- preferred_name, phone, personal_email. Everything else is admin-controlled.
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
       or new.full_name is distinct from old.full_name then
      raise exception 'This field can only be changed by an Admin or Owner.';
    end if;
  end if;
  return new;
end;
$$;
