-- Track which month each circuit was last invoiced so recurring billing is idempotent.
alter table public.network_circuits add column last_billed_month text;
