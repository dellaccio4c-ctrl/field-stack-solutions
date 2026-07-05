import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { projectNext, type PumpSite } from "@/lib/pump";

const OPEN_STATUSES = ["open", "scheduled", "in_progress", "on_hold"];

// Best-effort two-letter state extraction from a freeform address,
// so generated orders show up in the trip planner's state view.
function bestEffortState(address: string): string | null {
  const match =
    address.match(/,\s*([A-Z]{2})\s+\d{5}(-\d{4})?\s*$/) ??
    address.match(/,\s*([A-Z]{2})\s*$/) ??
    address.match(/\b([A-Z]{2})\s+\d{5}(-\d{4})?\b/);
  return match ? match[1] : null;
}

export type PmRunResult = {
  pumpCreated: number;
  equipmentCreated: number;
  skipped: number;
  errors: string[];
};

/**
 * Generates preventative-maintenance work orders:
 *  - Pump sites whose projected service window has opened
 *  - Equipment whose PM interval (from last completed service, or install
 *    date) is due within its window
 * Idempotent: skips anything that already has an open work order.
 */
export async function generatePmWorkOrders(): Promise<PmRunResult> {
  const admin = createAdminClient();
  const result: PmRunResult = {
    pumpCreated: 0,
    equipmentCreated: 0,
    skipped: 0,
    errors: [],
  };
  const today = new Date();

  // ---------- Pump sites ----------
  const { data: sites } = await admin
    .from("pump_sites")
    .select("*")
    .eq("is_active", true)
    .not("last_pumped", "is", null);

  const { data: openPumpWOs } = await admin
    .from("work_orders")
    .select("pump_site_id")
    .in("status", OPEN_STATUSES)
    .not("pump_site_id", "is", null);
  const sitesWithOpenWO = new Set(
    (openPumpWOs ?? []).map((w) => w.pump_site_id)
  );

  for (const site of (sites ?? []) as PumpSite[]) {
    const proj = projectNext(site, today);
    if (!proj.windowStart || today < proj.windowStart) continue;
    if (sitesWithOpenWO.has(site.id)) {
      result.skipped++;
      continue;
    }

    const { error } = await admin.from("work_orders").insert({
      title: `Pump-out — ${site.client_name}${site.site_label ? ` (${site.site_label})` : ""}`,
      description: `Auto-generated preventative pump-out. Interval: every ${site.interval_months} months. Last pumped: ${site.last_pumped}. Target window: ${proj.windowStart?.toISOString().slice(0, 10)} to ${proj.windowEnd?.toISOString().slice(0, 10)}.${site.notes ? `\n\nSite notes: ${site.notes}` : ""}`,
      wo_type: "pumping",
      is_pumping: true,
      priority: proj.overdue ? "high" : "normal",
      address: site.address,
      state: bestEffortState(site.address),
      lat: site.lat,
      lng: site.lng,
      pump_site_id: site.id,
      scheduled_date: proj.nextDue?.toISOString().slice(0, 10) ?? null,
      status: "open",
    });
    if (error) result.errors.push(`pump site ${site.client_name}: ${error.message}`);
    else result.pumpCreated++;
  }

  // ---------- Equipment ----------
  const { data: equipment } = await admin
    .from("equipment")
    .select("*, locations(address, city, state, zip), customers(name)")
    .eq("status", "active")
    .not("pm_interval_months", "is", null);

  for (const eq of equipment ?? []) {
    // Last service = most recent completed WO for this unit, else install date.
    const { data: lastWO } = await admin
      .from("work_orders")
      .select("completed_at")
      .eq("equipment_id", eq.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const baseline = lastWO?.completed_at
      ? new Date(lastWO.completed_at)
      : eq.install_date
        ? new Date(eq.install_date + "T00:00:00")
        : null;
    if (!baseline) continue;

    const due = new Date(baseline);
    due.setMonth(due.getMonth() + eq.pm_interval_months);
    const windowStart = new Date(due);
    windowStart.setDate(windowStart.getDate() - (eq.pm_window_days ?? 14));
    if (today < windowStart) continue;

    // Skip if an open preventative WO already exists for this unit.
    const { count } = await admin
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .eq("equipment_id", eq.id)
      .eq("wo_type", "preventative")
      .in("status", OPEN_STATUSES);
    if ((count ?? 0) > 0) {
      result.skipped++;
      continue;
    }

    const loc = eq.locations as {
      address: string;
      city: string | null;
      state: string | null;
      zip: string | null;
    } | null;

    const { error } = await admin.from("work_orders").insert({
      title: `PM — ${eq.name}${eq.unit_number ? ` (Unit ${eq.unit_number})` : ""}`,
      description: `Auto-generated preventative maintenance. Interval: every ${eq.pm_interval_months} months. Last service: ${baseline.toISOString().slice(0, 10)}. Due: ${due.toISOString().slice(0, 10)}.${eq.serial_number ? `\nSerial: ${eq.serial_number}` : ""}${eq.notes ? `\n\nEquipment notes: ${eq.notes}` : ""}`,
      wo_type: "preventative",
      priority: today > due ? "high" : "normal",
      customer_id: eq.customer_id,
      location_id: eq.location_id,
      equipment_id: eq.id,
      address: loc?.address ?? null,
      city: loc?.city ?? null,
      state: loc?.state?.toUpperCase() ?? null,
      zip: loc?.zip ?? null,
      scheduled_date: due.toISOString().slice(0, 10),
      status: "open",
    });
    if (error) result.errors.push(`equipment ${eq.name}: ${error.message}`);
    else result.equipmentCreated++;
  }

  return result;
}
