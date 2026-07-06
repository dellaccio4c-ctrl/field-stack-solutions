-- Per-user notification preferences (email toggles), self-editable.
alter table public.profiles add column notify_prefs jsonb not null default '{}';
