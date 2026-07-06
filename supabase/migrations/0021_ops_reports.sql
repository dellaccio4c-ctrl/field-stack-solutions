-- Operations reporting engine: form definitions (daily/weekly/monthly/quarterly/
-- semi-annual/annual cadences plus event-driven forms like site closures) and
-- their submitted entries. Field definitions live in jsonb so forms are editable
-- without schema changes.

create table public.ops_forms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text,
  cadence text not null default 'daily'
    check (cadence in ('daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'event')),
  due_note text,
  description text,
  fields jsonb not null default '[]',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.ops_forms enable row level security;
create policy ops_forms_select on public.ops_forms for select using (public.current_rank() >= 1);
create policy ops_forms_write on public.ops_forms for all
  using (public.current_rank() >= 4) with check (public.current_rank() >= 4);

create table public.ops_entries (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.ops_forms(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  submitted_by uuid references public.profiles(id) on delete set null,
  entry_date date not null default current_date,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index ops_entries_form_idx on public.ops_entries (form_id, entry_date);
create index ops_entries_location_idx on public.ops_entries (location_id);

alter table public.ops_entries enable row level security;
create policy ops_entries_select on public.ops_entries for select using (public.current_rank() >= 1);
create policy ops_entries_insert on public.ops_entries for insert with check (public.current_rank() >= 1);
create policy ops_entries_update on public.ops_entries for update using (public.current_rank() >= 3);
create policy ops_entries_delete on public.ops_entries for delete using (public.current_rank() >= 3);

-- Seed the standard PM reporting cadence + site closure, modeled on the
-- multi-site operator playbook (fields editable later without migrations).
insert into public.ops_forms (name, department, cadence, due_note, description, fields) values
('PM Daily Report', 'Maintenance', 'daily', 'Every day of operations by the opening or closing manager/lead.', 'Daily preventative maintenance walkthrough.', '[
  {"key":"equipment_ok","label":"All equipment operating normally","type":"checkbox"},
  {"key":"chemicals_ok","label":"Chemical levels checked and topped off","type":"checkbox"},
  {"key":"safety_ok","label":"Safety systems checked (e-stops, signage, gates)","type":"checkbox"},
  {"key":"issues_found","label":"Issues found","type":"textarea"},
  {"key":"cars_washed","label":"Cars washed today","type":"number"},
  {"key":"downtime_minutes","label":"Downtime (minutes)","type":"number"}
]'::jsonb),
('PM Weekly Report', 'Maintenance', 'weekly', 'Every week on Tuesday.', 'Weekly preventative maintenance checks.', '[
  {"key":"belts_hoses","label":"Belts, hoses, and fittings inspected","type":"checkbox"},
  {"key":"lubrication","label":"Bearings and chains lubricated","type":"checkbox"},
  {"key":"filters","label":"Filters checked / cleaned","type":"checkbox"},
  {"key":"backroom_clean","label":"Equipment room clean and organized","type":"checkbox"},
  {"key":"issues_found","label":"Issues found","type":"textarea"}
]'::jsonb),
('PM Monthly Report', 'Maintenance', 'monthly', '1st Tuesday of every month.', 'Monthly preventative maintenance program.', '[
  {"key":"motors_amps","label":"Motor amp draws recorded and in range","type":"checkbox"},
  {"key":"water_quality","label":"Water quality / RO system tested","type":"checkbox"},
  {"key":"calibration","label":"Chemical dilution calibrated","type":"checkbox"},
  {"key":"wear_parts","label":"Wear parts inventory reviewed","type":"checkbox"},
  {"key":"issues_found","label":"Issues found","type":"textarea"}
]'::jsonb),
('PM Quarterly Report', 'Maintenance', 'quarterly', '1st Tuesday of each quarter.', 'Quarterly deep maintenance and facility audit.', '[
  {"key":"deep_inspection","label":"Deep equipment inspection completed","type":"checkbox"},
  {"key":"electrical","label":"Electrical panels inspected and torqued","type":"checkbox"},
  {"key":"structural","label":"Building / structural items inspected","type":"checkbox"},
  {"key":"issues_found","label":"Issues found","type":"textarea"},
  {"key":"followup_needed","label":"Follow-up work orders needed","type":"textarea"}
]'::jsonb),
('PM Semi-Annual Report', 'Maintenance', 'semi_annual', 'Twice per year.', 'Semi-annual major service review.', '[
  {"key":"major_service","label":"Major service items completed","type":"textarea"},
  {"key":"vendor_service","label":"Vendor / manufacturer service performed","type":"textarea"},
  {"key":"issues_found","label":"Issues found","type":"textarea"}
]'::jsonb),
('PM Annual Report', 'Maintenance', 'annual', '1st Tuesday of each new calendar year.', 'Annual equipment and facility condition report.', '[
  {"key":"equipment_condition","label":"Overall equipment condition","type":"select","options":["Excellent","Good","Fair","Poor"]},
  {"key":"capex_needs","label":"Capital replacement needs for the coming year","type":"textarea"},
  {"key":"summary","label":"Annual summary","type":"textarea"}
]'::jsonb),
('Site Closure Report', 'Operations', 'event', 'Immediately upon closure of operations.', 'Report a location closure — weather, staffing, utility outage, repairs, remodel, etc.', '[
  {"key":"reason","label":"Closure reason","type":"select","options":["Inclement weather","Staffing","Utility outage","Equipment failure","Repairs","Remodel","Other"]},
  {"key":"closed_at","label":"Closed at (time)","type":"text"},
  {"key":"expected_reopen","label":"Expected reopen","type":"text"},
  {"key":"description","label":"What happened","type":"textarea","required":true},
  {"key":"customers_impacted","label":"Customers impacted","type":"checkbox"}
]'::jsonb);
