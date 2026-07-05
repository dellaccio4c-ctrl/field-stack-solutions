-- Employee record fields.
alter table public.profiles
  add column employee_code text,
  add column job_title text,
  add column phone text,
  add column territory text,
  add column hire_date date,
  add column notes text;

create unique index profiles_employee_code_unique
  on public.profiles (employee_code) where employee_code is not null;

-- Employee-record fields may only be changed by admin+ (rank 4+).
-- Regular users can still update their own profile (e.g. full_name),
-- but not their own employee record fields.
create or replace function public.enforce_employee_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and public.current_rank() < 4 then
    if new.employee_code is distinct from old.employee_code
       or new.job_title is distinct from old.job_title
       or new.territory is distinct from old.territory
       or new.hire_date is distinct from old.hire_date
       or new.notes is distinct from old.notes then
      raise exception 'Employee record fields can only be changed by an Admin or Owner.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_profiles_employee_fields
  before update on public.profiles
  for each row execute function public.enforce_employee_fields();
