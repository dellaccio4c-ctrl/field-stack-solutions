"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ImportEquipmentRow = {
  customer_name: string;
  site_label?: string;
  name: string;
  category?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  unit_number?: string;
  install_date?: string;
  warranty_expires?: string;
  pm_interval_months?: string;
  pm_window_days?: string;
  notes?: string;
};

function asDate(v?: string) {
  if (!v?.trim()) return null;
  const d = new Date(v.trim());
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function asInt(v?: string) {
  if (!v?.trim()) return null;
  const n = parseInt(v, 10);
  return isNaN(n) || n <= 0 ? null : n;
}

// Bulk import equipment from a spreadsheet. Customers are matched by name and
// created when missing; sites are matched by label under that customer (left
// blank when no match — noted in the result). Duplicates are skipped by serial
// number, or by customer+name+unit number when no serial is given.
export async function importEquipment(rows: ImportEquipmentRow[]) {
  const supabase = await createClient();
  if (!rows.length)
    return { error: "Nothing to import.", imported: 0, skipped: 0, newCustomers: 0, unmatchedSites: 0 };
  if (rows.length > 500)
    return { error: "That's over 500 rows — split the file and import in batches.", imported: 0, skipped: 0, newCustomers: 0, unmatchedSites: 0 };

  const [{ data: customers, error: custErr }, { data: locations }, { data: existing }] =
    await Promise.all([
      supabase.from("customers").select("id, name"),
      supabase.from("locations").select("id, label, customer_id"),
      supabase.from("equipment").select("customer_id, name, serial_number, unit_number"),
    ]);
  if (custErr)
    return { error: custErr.message, imported: 0, skipped: 0, newCustomers: 0, unmatchedSites: 0 };

  const customerByName = new Map(
    (customers ?? []).map((c) => [c.name.trim().toLowerCase(), c.id])
  );
  const locationKey = (customerId: string, label: string) =>
    `${customerId}|${label.trim().toLowerCase()}`;
  const locationByKey = new Map(
    (locations ?? []).map((l) => [locationKey(l.customer_id, l.label ?? ""), l.id])
  );
  const serials = new Set(
    (existing ?? [])
      .map((e) => (e.serial_number ?? "").trim().toLowerCase())
      .filter(Boolean)
  );
  const nameKeys = new Set(
    (existing ?? []).map(
      (e) =>
        `${e.customer_id}|${(e.name ?? "").trim().toLowerCase()}|${(e.unit_number ?? "").trim().toLowerCase()}`
    )
  );

  let imported = 0;
  let skipped = 0;
  let newCustomers = 0;
  let unmatchedSites = 0;

  for (const row of rows) {
    const customerName = row.customer_name.trim();
    const name = row.name.trim();
    if (!customerName || !name) {
      skipped++;
      continue;
    }

    let customerId = customerByName.get(customerName.toLowerCase());
    if (!customerId) {
      const { data: created, error: createErr } = await supabase
        .from("customers")
        .insert({ name: customerName })
        .select("id")
        .single();
      if (createErr)
        return { error: `Creating customer "${customerName}": ${createErr.message}`, imported, skipped, newCustomers, unmatchedSites };
      customerId = created.id;
      customerByName.set(customerName.toLowerCase(), customerId);
      newCustomers++;
    }

    const serial = (row.serial_number ?? "").trim();
    const unit = (row.unit_number ?? "").trim();
    const nameKey = `${customerId}|${name.toLowerCase()}|${unit.toLowerCase()}`;
    if ((serial && serials.has(serial.toLowerCase())) || nameKeys.has(nameKey)) {
      skipped++;
      continue;
    }

    let locationId: string | null = null;
    if (row.site_label?.trim()) {
      locationId =
        locationByKey.get(locationKey(customerId, row.site_label)) ?? null;
      if (!locationId) unmatchedSites++;
    }

    const { error: insErr } = await supabase.from("equipment").insert({
      customer_id: customerId,
      location_id: locationId,
      name,
      category: row.category?.trim() || null,
      brand: row.brand?.trim() || null,
      model: row.model?.trim() || null,
      serial_number: serial || null,
      unit_number: unit || null,
      install_date: asDate(row.install_date),
      warranty_expires: asDate(row.warranty_expires),
      pm_interval_months: asInt(row.pm_interval_months),
      pm_window_days: asInt(row.pm_window_days) ?? 14,
      notes: row.notes?.trim() || null,
    });
    if (insErr)
      return { error: `Row "${name}": ${insErr.message}`, imported, skipped, newCustomers, unmatchedSites };
    if (serial) serials.add(serial.toLowerCase());
    nameKeys.add(nameKey);
    imported++;
  }

  revalidatePath("/app/equipment");
  return { error: null, imported, skipped, newCustomers, unmatchedSites };
}
