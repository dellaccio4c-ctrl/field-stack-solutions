-- E-signatures on customer estimate approval.
alter table public.estimates
  add column signed_by_name text,
  add column signature_data text,   -- data-URL PNG of the drawn signature
  add column signed_at timestamptz;
