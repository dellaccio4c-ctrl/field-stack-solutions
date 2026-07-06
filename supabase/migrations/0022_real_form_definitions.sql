-- Replace placeholder field definitions with the real operator forms
-- (transcribed from the live reference forms) and add the daily-ops set.
-- PM Daily / PM Quarterly / Maintenance Report source forms were deleted
-- upstream, so our own definitions stand for those.

update public.ops_forms set
  due_note = 'Every Tuesday — no later than 9:00pm.',
  description = 'Weekly preventative maintenance checklist. Report any suspected or known issues to the Maintenance Department.',
  fields = '[
    {"key":"backup_mcc","label":"Backup MCC / Tunnel Controller","type":"select","options":["Completed","Not Completed"]},
    {"key":"irrigation","label":"Irrigation tested (function + leaks)","type":"select","options":["Completed","Not Performed"]},
    {"key":"pressure_wash_conveyor","label":"Pressure wash conveyor (incl. underneath)","type":"select","options":["Completed","Not Performed"]},
    {"key":"omni_nozzles","label":"Omni tube & rotating turbo nozzles cleaned","type":"select","options":["Completed","Not Performed"]},
    {"key":"hp_filter_strainer","label":"High pressure pump filter & strainer","type":"select","options":["Completed","Not Performed"]},
    {"key":"top_brush_bearings","label":"Top brush bearings (2 pumps per bearing)","type":"select","options":["Completed","Not Performed"]},
    {"key":"buff_dry_bearings","label":"Buff & dry bearings","type":"select","options":["Completed","Not Performed","Not Applicable (do not have)"]},
    {"key":"vacuum_turbine_bearings","label":"Vacuum bearings on turbine","type":"select","options":["Completed","Not Performed"]},
    {"key":"grill_brush_bearing","label":"Grill brush bearing","type":"select","options":["Completed","Not Performed","Not Applicable (do not have)"]},
    {"key":"wrap_bearings","label":"Wrap bearings (2 pumps per wrap)","type":"select","options":["Completed","Not Performed"]},
    {"key":"rocker_bearings","label":"Rocker brush bearings","type":"select","options":["Completed","Not Performed"]},
    {"key":"tire_brush_bearings","label":"Tire brush rotational bearings","type":"select","options":["Completed","Not Performed"]},
    {"key":"tire_shine_bearings","label":"Tire shine rotational bearings","type":"select","options":["Completed","Not Performed"]},
    {"key":"conveyor_bearings","label":"Conveyor bearings (entry + exit)","type":"select","options":["Completed","Not Performed"]},
    {"key":"pp_oil_clean","label":"Is the oil in power packs clean (not milky)?","type":"select","options":["Yes","No"]},
    {"key":"pp_filter_date","label":"When was the power pack filter last changed?","type":"date"},
    {"key":"pp_oil_replenish","label":"Do the power packs need oil?","type":"select","options":["Yes","No"]},
    {"key":"pp_cleaning","label":"Power pack assembly cleaned (no direct water)","type":"select","options":["Completed","Not Performed"]},
    {"key":"hyd_hoses","label":"Hydraulic hoses & fittings inspected for leaks","type":"select","options":["Completed","Not Performed"]},
    {"key":"conveyor_pulse","label":"Conveyor pulse speed reading","type":"number"},
    {"key":"storage_tanks_clean","label":"Storage tanks cleaned of sediment & dirt","type":"select","options":["Completed","Not Performed"]},
    {"key":"hp_lines","label":"High pressure lines, fittings, nozzles inspected","type":"select","options":["Completed","Not Performed"]},
    {"key":"h25_belts","label":"H25 high pressure pump belts checked","type":"select","options":["Completed","Not Performed"]},
    {"key":"compressor_belts","label":"Compressor oil + belts checked","type":"select","options":["Completed","Not Performed"]},
    {"key":"drain_compressor_water","label":"Compressor water drained, auto dump tested","type":"select","options":["Completed","Not Performed"]},
    {"key":"conveyor_tension","label":"Conveyor tension check","type":"select","options":["Completed","Not Performed"]},
    {"key":"conveyor_links","label":"All conveyor links and rollers checked","type":"select","options":["Completed","Not Performed"]},
    {"key":"heco","label":"Heco hoses and motor inspected (tunnel exit)","type":"select","options":["Completed","Not Performed"]},
    {"key":"sludge_removal","label":"Trench / pit sludge removed","type":"select","options":["Completed","Not Performed"]},
    {"key":"walls_arches","label":"Walls & arches brushed and pressure washed","type":"select","options":["Completed","Not Performed"]},
    {"key":"tunnel_floors","label":"Tunnel floors pressure washed","type":"select","options":["Completed","Not Performed"]},
    {"key":"light_bars","label":"Light bars wiped down","type":"select","options":["Completed","Not Performed"]},
    {"key":"foamers","label":"Foamers cleaned (insert removed and hosed)","type":"select","options":["Completed","Not Performed"]},
    {"key":"star_gates","label":"Star gates cleaned","type":"select","options":["Completed","Not Performed"]},
    {"key":"exit_light_timing","label":"Exit light timing verified","type":"select","options":["Completed","Not Performed"]},
    {"key":"tire_shine_brush","label":"Tire shine brush pressure washed","type":"select","options":["Completed","Not Performed"]},
    {"key":"tire_shine_manifold","label":"Tire shine manifold cleaned and checked","type":"select","options":["Completed","Not Performed"]},
    {"key":"tire_shine_unit","label":"Tire shine unit pressure washed","type":"select","options":["Completed","Not Performed"]},
    {"key":"cylinder_rod_ends","label":"Air cylinder rod ends lubricated","type":"select","options":["Completed","Not Performed"]},
    {"key":"all_complete","label":"Were you able to successfully complete all tasks?","type":"select","options":["Yes - Everything completed or went well","No - There was a problem or a task not performed"],"required":true},
    {"key":"comments","label":"Comments or feedback on this PM list","type":"textarea"}
  ]'::jsonb
where name = 'PM Weekly Report';

update public.ops_forms set
  due_note = '1st Tuesday of every month — no later than 9:00pm.',
  description = 'Monthly preventative maintenance checklist. Report any suspected or known issues to the Maintenance Department.',
  fields = '[
    {"key":"tire_shine_swing_arm","label":"Tire shine swing arm greased (2 bearings/arm)","type":"select","options":["Completed","Not Performed"]},
    {"key":"rod_end_bearings","label":"Rod end bearings on air cylinders greased","type":"select","options":["Completed","Not Completed"]},
    {"key":"tire_brush_swing_arm","label":"Tire brush swing arm bearings (2 per brush)","type":"select","options":["Completed","Not Performed"]},
    {"key":"wrap_pillow_block","label":"Pillow block bearings on wraps (2 per arm)","type":"select","options":["Completed","Not Performed"]},
    {"key":"buff_dry_swing_arm","label":"Buff & dry swing arm bearings","type":"select","options":["Completed","Not Performed"]},
    {"key":"top_brush","label":"Top brush bearings greased","type":"select","options":["Completed","Not Performed"]},
    {"key":"grill_pillow_block","label":"Pillow block bearings on grill brush","type":"select","options":["Completed","Not Performed"]},
    {"key":"roller_up_fork","label":"Roller up fork bearings (each side of conveyor)","type":"select","options":["Completed","Not Performed"]},
    {"key":"ro_filters","label":"RO filters — 5 micron filter replaced","type":"select","options":["Completed","Not Performed"]},
    {"key":"storage_tanks","label":"Storage / solution tanks cleaned","type":"select","options":["Completed","Not Performed"]},
    {"key":"filter_regulator","label":"Filter regulator lubricator oil level checked","type":"select","options":["Completed","Not Performed"]},
    {"key":"hardware_check","label":"All hardware tight and clean in entire assembly?","type":"select","options":["Yes","No"]},
    {"key":"drive_belts","label":"Drive belts checked for wear / damage","type":"select","options":["Completed","Not Performed"]},
    {"key":"door_latches","label":"Access door latches lubricated","type":"select","options":["Completed","Not Performed"]},
    {"key":"mcc_filter","label":"MCC filter cleaned","type":"select","options":["Completed","Not Performed"]},
    {"key":"vacuum_lines","label":"Vacuum lines cleaned (kitty litter method)","type":"select","options":["Completed","Not Performed"]},
    {"key":"all_complete","label":"Were you able to successfully complete all items?","type":"select","options":["Yes - Everything completed or went well","No - There was a problem or a task not performed"],"required":true},
    {"key":"comments","label":"Comments or feedback on this PM list","type":"textarea"}
  ]'::jsonb
where name = 'PM Monthly Report';

update public.ops_forms set
  due_note = '1st Tuesday of June (and December) — no later than 9:00pm.',
  description = 'Semi-annual preventative maintenance checklist.',
  fields = '[
    {"key":"buff_n_dry","label":"Buff n dry cloth checked for wear / damage","type":"select","options":["Completed","Not Performed"]},
    {"key":"power_pack_filter","label":"Hydraulic power pack return line filter replaced","type":"select","options":["Completed","Not Performed"]},
    {"key":"air_comp_filter","label":"Air compressor oil & filter changed (all units)","type":"select","options":["Completed","Not Performed"]},
    {"key":"electric_motors","label":"Electric motors greased (1 pump per motor)","type":"select","options":["Completed","Not Performed","Not Applicable"]},
    {"key":"air_dryer_filter","label":"Compressor air dryer filter replaced","type":"select","options":["Completed","Not Performed"]},
    {"key":"flip_conveyor_chain","label":"Conveyor chain flipped 180° section by section","type":"select","options":["Completed","Not Performed"]},
    {"key":"all_complete","label":"Confirmation","type":"select","options":["Yes - Everything completed or went well","No - There was a problem or a task not performed"],"required":true},
    {"key":"comments","label":"Comments or feedback on this PM list","type":"textarea"}
  ]'::jsonb
where name = 'PM Semi-Annual Report';

update public.ops_forms set
  due_note = '1st Tuesday of every January.',
  description = 'Annual preventative maintenance report.',
  fields = '[
    {"key":"hydraulic_power_pack","label":"Hydraulic power pack oil drained, purged, refilled","type":"select","options":["Completed","Not Performed"]},
    {"key":"conveyor_chain","label":"Conveyor chain removed, flipped, worn chain replaced","type":"select","options":["Completed","Not Performed"]},
    {"key":"roller_bushings","label":"Roller take up bushings inspected / replaced","type":"select","options":["Completed","Not Performed"]},
    {"key":"nozzles","label":"All nozzles replaced","type":"select","options":["Completed","Not Performed"]},
    {"key":"compressor_kit","label":"Manufacturer compressor maintenance kit installed","type":"select","options":["Completed","Not Performed"]},
    {"key":"all_complete","label":"Were you able to successfully complete all items?","type":"select","options":["Yes - Everything completed or went well","No - There was a problem or a task not performed"],"required":true},
    {"key":"comments","label":"Comments or feedback on this PM list","type":"textarea"}
  ]'::jsonb
where name = 'PM Annual Report';

update public.ops_forms set
  due_note = 'Submit if the site will be down and inoperable more than 15 minutes.',
  description = 'Report a location closure — weather, staffing, utility outage, repairs, remodel, etc.',
  fields = '[
    {"key":"closure_type","label":"Closure type","type":"select","options":["Same Day Temporary Closure","Closing Remainder of the Day","Closed for Multi-Day Repair/Remodel","Holiday"],"required":true},
    {"key":"mgt_contact","label":"Management contact","type":"select","options":["Yes - I have spoken with my direct supervisor","No - I have not spoken with my direct supervisor"],"required":true},
    {"key":"description","label":"What happened","type":"textarea","required":true},
    {"key":"expected_reopen","label":"Expected reopen","type":"text"}
  ]'::jsonb
where name = 'Site Closure Report';

insert into public.ops_forms (name, department, cadence, due_note, description, fields) values
('Opening Checklist', 'Operations', 'daily', 'Every day prior to opening — no later than 7:30am.', 'Prepares the location for operation each day and upholds operational standards.', '[
  {"key":"water_meter","label":"Log water meter reading","type":"number","required":true},
  {"key":"bva_report","label":"BvA report update","type":"select","options":["Completed","Not Performed"]},
  {"key":"daily_huddle","label":"Daily huddle","type":"select","options":["Completed","Not Performed"]},
  {"key":"bullseye_chemical","label":"Bullseye containers have chemical, pulling with no air bubbles","type":"select","options":["Completed","Not Performed"]},
  {"key":"hydraflex_board","label":"Hydra-Flex board OK","type":"select","options":["Yes","No"]},
  {"key":"tire_link","label":"Tire link OK","type":"select","options":["Yes","No"]},
  {"key":"grundfos_repress","label":"Grundfos light green, repress on auto, reclaim on auto","type":"select","options":["Yes","No"]},
  {"key":"salt_level","label":"Salt level check","type":"select","options":["Yes","No"]},
  {"key":"wet_down","label":"Wet down","type":"select","options":["Completed","Not Performed"]},
  {"key":"pantron","label":"Pantron","type":"select","options":["Completed","Not Performed"]},
  {"key":"camera_cleaning","label":"Camera cleaning","type":"select","options":["Completed","Not Performed"]},
  {"key":"chain_tension","label":"Check chain tension","type":"select","options":["Completed","Not Performed"]},
  {"key":"test_car","label":"Test car and walkthrough","type":"select","options":["Completed","Not Performed"]},
  {"key":"signage_wipe","label":"Wipe down signage and entrance arch as needed","type":"select","options":["Completed","Not Performed"]},
  {"key":"pay_station","label":"Pay station","type":"select","options":["Completed","Not Performed"]},
  {"key":"outside_bathrooms","label":"Open outside bathrooms","type":"select","options":["Completed","Not Performed","Does Not Apply"]},
  {"key":"mat_machine_sink","label":"Mat machine & sink","type":"select","options":["Completed","Not Performed"]},
  {"key":"bug_prep","label":"Fill bug prep stations","type":"select","options":["Completed","Not Performed"]},
  {"key":"booms_wipe","label":"Wipe down booms with cleaner & towel as needed","type":"select","options":["Completed","Not Performed"]},
  {"key":"lot_perimeter","label":"Lot & perimeter","type":"select","options":["Completed","Not Performed"]},
  {"key":"vacuums_on","label":"Vacuums on at 7:15am when second opener arrives","type":"select","options":["Completed","Not Performed"]},
  {"key":"open_lanes","label":"Lanes open, cones out of sight at 7:30am","type":"select","options":["Completed","Not Performed"]},
  {"key":"radio_on","label":"Turn on the radio","type":"select","options":["Completed","Not Performed"]},
  {"key":"opened_on_time","label":"Did the site open on time?","type":"select","options":["Yes","No"],"required":true},
  {"key":"all_complete","label":"Were you able to successfully complete all items?","type":"select","options":["Yes - Everything went well","No - There was a problem"],"required":true}
]'::jsonb),
('Daily Cleaning Checklist', 'Operations', 'daily', 'Start by 6:00pm, before the Daily Closing Checklist.', 'Nightly cleaning tasks.', '[
  {"key":"day_of_week","label":"Day of the week","type":"select","options":["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],"required":true},
  {"key":"buff_dry_cloth","label":"Buff & dry cloth","type":"select","options":["Completed","Not Performed","Not Applicable (do not have)"]},
  {"key":"hp_filters_strainers","label":"Clean all filters & strainers on high pressure pumps","type":"select","options":["Completed","Not Performed"]},
  {"key":"notes","label":"Notes","type":"textarea"}
]'::jsonb),
('Site Walkthrough Checklist', 'Operations', 'daily', 'To be completed at 11:00am and 3:00pm every day.', 'Recurring site walkthrough with numbers check.', '[
  {"key":"walkthrough_time","label":"Time of walkthrough","type":"select","options":["11:00 AM","3:00 PM"],"required":true},
  {"key":"conveyor_foreign","label":"Conveyor checked for foreign objects","type":"select","options":["Completed","Not Performed"]},
  {"key":"cleaning_material","label":"Cleaning material checked (foreign objects, excess water)","type":"select","options":["Completed","Not Performed"]},
  {"key":"conveyor_trench","label":"Conveyor trench — water buildup & reclaim flow","type":"select","options":["Completed","Not Performed"]},
  {"key":"blower_intake","label":"Blower intake screens clear, gators opening properly","type":"select","options":["Completed","Not Performed"]},
  {"key":"tunnel_walkthrough","label":"Vehicle tunnel walkthrough","type":"select","options":["Completed","Not Performed"]},
  {"key":"wash_quality","label":"Vehicle wash quality inspected","type":"select","options":["Completed","Not Performed"]},
  {"key":"air_link","label":"Air link","type":"select","options":["Completed","Not Performed"]},
  {"key":"tire_link","label":"Tire link","type":"select","options":["Completed","Not Performed"]},
  {"key":"hydraflex_board","label":"Hydra-Flex board OK","type":"select","options":["Yes","No"]},
  {"key":"leak_inspect","label":"Backroom inspected for water and hydraulic leaks","type":"select","options":["Completed","Not Performed"]},
  {"key":"chem_air_regulators","label":"Chemical & air regulators on chemical boards checked","type":"select","options":["Completed","Not Performed"]},
  {"key":"chemical_levels","label":"Chemical levels OK","type":"select","options":["Yes","No"]},
  {"key":"pumps_verify","label":"Reclaim, Grundfos, high pressure pumps working properly","type":"select","options":["Completed","Not Performed"]},
  {"key":"air_compressor","label":"Air compressor","type":"select","options":["Completed","Not Performed"]},
  {"key":"touch_screens","label":"Touch screens OK","type":"select","options":["Yes","No"]},
  {"key":"bathrooms_lobby","label":"Bathrooms, lobby, hallways checked / cleaned","type":"select","options":["Completed","Not Performed"]},
  {"key":"empty_garbage","label":"Garbage cans emptied","type":"select","options":["Completed","Not Performed"]},
  {"key":"empty_towel_bins","label":"Dirty towel bins emptied","type":"select","options":["Completed","Not Performed"]},
  {"key":"fill_towel_bins","label":"Clean towel bins filled","type":"select","options":["Completed","Not Performed"]},
  {"key":"vacuum_suction","label":"Vacuum suction OK","type":"select","options":["Yes","No"]},
  {"key":"problems","label":"Any problems performing these tasks?","type":"select","options":["No - Everything went well","Yes - There was a problem"],"required":true},
  {"key":"problems_desc","label":"Describe the problems encountered","type":"textarea"},
  {"key":"total_cars","label":"Total cars #","type":"number"},
  {"key":"net_cars","label":"Net cars #","type":"number"},
  {"key":"employees_on_clock","label":"Employees on the clock","type":"number"},
  {"key":"new_member_sales","label":"New member sales total","type":"number"},
  {"key":"three_pack_sales","label":"Total # of 3-pack sales","type":"number"},
  {"key":"rewash_count","label":"Rewash entry #","type":"number"},
  {"key":"rewash_desc","label":"Rewash entry description","type":"textarea"}
]'::jsonb),
('Daily Closing Checklist', 'Operations', 'daily', 'Begin at 7:00pm; submit by 8:00pm, no later than 9:00pm.', 'Daily closing procedures report.', '[
  {"key":"dumpster_towels","label":"Dumpster door locked; towels, brushes, supplies brought inside","type":"select","options":["Completed","Not Performed"]},
  {"key":"reclaim","label":"Reclaim","type":"select","options":["Completed","Not Completed"]},
  {"key":"radios_tablets","label":"Radios off & charging; tablets and phone on charger","type":"select","options":["Completed","Not Performed"]},
  {"key":"power_pack_oil","label":"Power packs filled with oil (if needed)","type":"select","options":["Completed","Not Performed"]},
  {"key":"closing_water_meter","label":"Closing water meter reading","type":"number","required":true},
  {"key":"all_complete","label":"Were you able to successfully complete all items?","type":"select","options":["Yes - Everything went well","No - There was a problem"],"required":true},
  {"key":"cleaning_checklist_done","label":"Daily cleaning checklist completed?","type":"select","options":["Yes","No"]},
  {"key":"customer_issues","label":"Any customer issues today?","type":"select","options":["Yes","No"]},
  {"key":"staffing_issues","label":"Any staffing issues today?","type":"select","options":["Yes","No"]},
  {"key":"equipment_issues","label":"Any equipment issues today?","type":"select","options":["Yes","No"]},
  {"key":"eod_wins","label":"End of day WINS or challenges","type":"textarea","required":true}
]'::jsonb),
('Customer Incident Claims', 'Operations', 'event', 'Immediately at time of incident. Use the L.A.S.T. approach: Listen, Apologize, Solve, Thank.', 'Complete immediately when a customer reports damages or company property is damaged.', '[
  {"key":"customer_first","label":"Customer first name","type":"text","required":true},
  {"key":"customer_last","label":"Customer last name","type":"text","required":true},
  {"key":"customer_phone","label":"Customer phone number","type":"text","required":true},
  {"key":"customer_email","label":"Customer email address","type":"text","required":true},
  {"key":"customer_address","label":"Customer address (street, city, state, zip)","type":"text","required":true},
  {"key":"registered_owner","label":"Verified registered owner name (from registration)","type":"text","required":true},
  {"key":"customer_type","label":"Customer type","type":"select","options":["Club Member","Single Wash","Employee"],"required":true},
  {"key":"license_plate","label":"License plate #","type":"text","required":true},
  {"key":"incident_time","label":"Time of incident (include time zone)","type":"text","required":true},
  {"key":"left_before_reporting","label":"Did the customer leave the property before reporting?","type":"select","options":["Yes","No"],"required":true},
  {"key":"vehicle_year","label":"Vehicle year","type":"number","required":true},
  {"key":"vehicle_make","label":"Vehicle make","type":"text","required":true},
  {"key":"vehicle_model","label":"Vehicle model","type":"text","required":true},
  {"key":"vehicle_color","label":"Vehicle color","type":"text","required":true},
  {"key":"paint_code","label":"Vehicle paint code (inside driver door panel)","type":"text"},
  {"key":"vin_last8","label":"VIN # last 8 digits","type":"text","required":true},
  {"key":"damage_location","label":"Location on vehicle of alleged damages","type":"text","required":true},
  {"key":"description","label":"Description of incident","type":"textarea","required":true},
  {"key":"prior_damage","label":"Vehicle appears to have prior damage?","type":"select","options":["No","Yes"],"required":true},
  {"key":"aftermarket_parts","label":"Vehicle appears to have aftermarket parts?","type":"select","options":["No","Yes"],"required":true},
  {"key":"company_property_damaged","label":"Was any company property damaged?","type":"select","options":["No","Yes"],"required":true},
  {"key":"claim_category","label":"Primary claim category","type":"select","options":["Blowers","Buff & Dry","Chemical","Conveyor","Gate Arm","Loading","Rockers","Tire Shine","Top Brush","Vacuums","Wraps"],"required":true},
  {"key":"legal_threat","label":"Has the customer threatened legal counsel?","type":"select","options":["No","Yes"],"required":true},
  {"key":"witnesses","label":"Team member witnesses other than yourself?","type":"select","options":["Yes","No"],"required":true},
  {"key":"additional_comments","label":"Additional incident comments","type":"textarea"}
]'::jsonb);
