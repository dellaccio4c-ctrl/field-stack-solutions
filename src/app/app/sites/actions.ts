"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ImportSiteRow = {
  customer_name: string;
  label?: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
};

// Bulk import sites from a spreadsheet. Customers are matched by name
// (case-insensitive) and created when missing. Rows whose address already
// exists under the same customer are skipped as duplicates. Coordinates are
// left for the "Locate map pins" backfill (the free geocoder is rate-limited).
export async function importSites(rows: ImportSiteRow[]) {
  const supabase = await createClient();
  if (!rows.length) return { error: "Nothing to import.", imported: 0, skipped: 0, newCustomers: 0 };
  if (rows.length > 500)
    return { error: "That's over 500 rows — split the file and import in batches.", imported: 0, skipped: 0, newCustomers: 0 };

  const { data: customers, error: custErr } = await supabase
    .from("customers")
    .select("id, name");
  if (custErr) return { error: custErr.message, imported: 0, skipped: 0, newCustomers: 0 };

  const byName = new Map(
    (customers ?? []).map((c) => [c.name.trim().toLowerCase(), c.id])
  );

  const { data: existing } = await supabase
    .from("locations")
    .select("customer_id, address");
  const existingKeys = new Set(
    (existing ?? []).map(
      (l) => `${l.customer_id}|${(l.address ?? "").trim().toLowerCase()}`
    )
  );

  let imported = 0;
  let skipped = 0;
  let newCustomers = 0;

  for (const row of rows) {
    const customerName = row.customer_name.trim();
    const address = row.address.trim();
    if (!customerName || !address) {
      skipped++;
      continue;
    }

    let customerId = byName.get(customerName.toLowerCase());
    if (!customerId) {
      const { data: created, error: createErr } = await supabase
        .from("customers")
        .insert({ name: customerName })
        .select("id")
        .single();
      if (createErr) return { error: `Creating customer "${customerName}": ${createErr.message}`, imported, skipped, newCustomers };
      customerId = created.id;
      byName.set(customerName.toLowerCase(), customerId);
      newCustomers++;
    }

    const key = `${customerId}|${address.toLowerCase()}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    const { error: insErr } = await supabase.from("locations").insert({
      customer_id: customerId,
      label: row.label?.trim() || address,
      address,
      city: row.city?.trim() || null,
      state: row.state?.trim() || null,
      zip: row.zip?.trim() || null,
      notes: row.notes?.trim() || null,
    });
    if (insErr) return { error: `Row "${address}": ${insErr.message}`, imported, skipped, newCustomers };
    existingKeys.add(key);
    imported++;
  }

  revalidatePath("/app/sites");
  revalidatePath("/app/customers");
  return { error: null, imported, skipped, newCustomers };
}
