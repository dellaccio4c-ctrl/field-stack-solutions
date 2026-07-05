-- Pumping division tag + scoped visibility for the Xpress Pumping role:
-- all customers, but only pumping-tagged estimates/invoices/financials.

alter table public.estimates add column is_pumping boolean not null default false;
alter table public.invoices add column is_pumping boolean not null default false;
alter table public.expenses add column is_pumping boolean not null default false;

create or replace function public.is_xpress()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'xpress_pumping' and is_active
  );
$$;

-- Estimates: staff see all EXCEPT xpress, who see only pumping-tagged.
drop policy estimates_select on public.estimates;
create policy estimates_select on public.estimates for select using (
  (public.current_rank() >= 1 and not public.is_xpress())
  or (public.is_xpress() and is_pumping)
  or (customer_id = public.current_customer_id() and status <> 'draft')
);

-- Invoices: same pattern.
drop policy invoices_select on public.invoices;
create policy invoices_select on public.invoices for select using (
  (public.current_rank() >= 1 and not public.is_xpress())
  or (public.is_xpress() and is_pumping)
  or (customer_id = public.current_customer_id() and status <> 'draft')
);

-- Line items follow their parent document.
drop policy line_items_select on public.line_items;
create policy line_items_select on public.line_items for select using (
  (public.current_rank() >= 1 and not public.is_xpress())
  or (public.is_xpress() and (
    exists (select 1 from public.invoices i where i.id = invoice_id and i.is_pumping)
    or exists (select 1 from public.estimates e where e.id = estimate_id and e.is_pumping)
  ))
  or exists (select 1 from public.invoices i where i.id = invoice_id and i.customer_id = public.current_customer_id() and i.status <> 'draft')
  or exists (select 1 from public.estimates e where e.id = estimate_id and e.customer_id = public.current_customer_id() and e.status <> 'draft')
);

-- Payments: owners see all; xpress sees payments on pumping invoices; customers their own.
drop policy payments_select on public.payments;
create policy payments_select on public.payments for select using (
  public.current_rank() >= 5
  or (public.is_xpress() and exists (
    select 1 from public.invoices i where i.id = invoice_id and i.is_pumping
  ))
  or exists (select 1 from public.invoices i where i.id = invoice_id and i.customer_id = public.current_customer_id())
);

-- Expenses: owners full control; xpress can view pumping-tagged.
drop policy expenses_all on public.expenses;
create policy expenses_owner_all on public.expenses for all using (public.current_rank() >= 5);
create policy expenses_xpress_select on public.expenses for select using (
  public.is_xpress() and is_pumping
);

-- Note: customers_select already grants staff ranks (incl. xpress at rank 2)
-- visibility of ALL customers — no change needed there.
