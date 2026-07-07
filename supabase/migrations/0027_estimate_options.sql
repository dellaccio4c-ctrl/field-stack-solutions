-- Good / Better / Best estimate options. Lines with no tier are shared;
-- tiered lines belong to one option. The customer's pick is recorded and
-- drives which lines convert to the invoice.
alter table public.line_items add column option_tier text
  check (option_tier in ('good', 'better', 'best'));
alter table public.estimates add column selected_option text
  check (selected_option in ('good', 'better', 'best'));
