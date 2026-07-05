-- Allow co-owners: an Owner may assign any role (including Owner).
-- Everyone below Owner keeps the strictly-higher rule. Nobody can ever
-- change their own role.
create or replace function public.enforce_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is null then
      -- service-role / migration context
      return new;
    end if;
    if auth.uid() = new.id then
      raise exception 'You cannot change your own access level.';
    end if;
    if public.current_rank() >= 5 then
      -- Owners may grant any level, including Owner.
      null;
    elsif public.current_rank() <= public.role_rank(old.role)
       or public.current_rank() <= public.role_rank(new.role) then
      raise exception 'Only a user with a higher access level can change this role.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
