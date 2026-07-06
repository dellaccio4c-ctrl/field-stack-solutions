"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type VendorPartRow = {
  vendor: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  unit?: string;
  cost?: string | number;
  url?: string;
};

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/[$,]/g, ""));
  return isNaN(n) || n < 0 ? null : n;
};

export async function savePart(id: string | null, fd: FormData) {
  const supabase = await createClient();
  const payload = {
    vendor: String(fd.get("vendor") ?? "").trim(),
    sku: String(fd.get("sku") ?? "").trim(),
    name: String(fd.get("name") ?? "").trim(),
    description: String(fd.get("description") ?? "").trim() || null,
    category: String(fd.get("category") ?? "").trim() || null,
    brand: String(fd.get("brand") ?? "").trim() || null,
    unit: String(fd.get("unit") ?? "").trim() || "each",
    cost: num(fd.get("cost")),
    url: String(fd.get("url") ?? "").trim() || null,
    last_checked: num(fd.get("cost")) != null ? new Date().toISOString().slice(0, 10) : null,
  };
  if (!payload.vendor || !payload.sku || !payload.name)
    return { error: "Vendor, part number, and name are required." };

  const { error } = id
    ? await supabase.from("vendor_parts").update(payload).eq("id", id)
    : await supabase.from("vendor_parts").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/app/vendor-parts");
  return { error: null };
}

export async function deletePart(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("vendor_parts").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/vendor-parts");
  return { error: null };
}

export async function setPartsMarkup(percent: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (me?.role !== "owner") return { error: "Owners only." };
  if (!(percent >= 0 && percent <= 500)) return { error: "Markup must be 0–500%." };

  const { data: settings } = await supabase.from("company_settings").select("id").single();
  const { error } = settings
    ? await supabase
        .from("company_settings")
        .update({ parts_markup_percent: percent })
        .eq("id", settings.id)
    : await supabase.from("company_settings").insert({ parts_markup_percent: percent });
  if (error) return { error: error.message };
  revalidatePath("/app/vendor-parts");
  return { error: null };
}

// Bulk import from vendor sheets / catalog extractions. Upserts on
// vendor+sku: re-importing updates names/prices instead of duplicating.
export async function importParts(rows: VendorPartRow[]) {
  const supabase = await createClient();
  if (!rows.length) return { error: "Nothing to import.", imported: 0, skipped: 0 };
  if (rows.length > 20000)
    return { error: "Over 20,000 rows — split the file.", imported: 0, skipped: 0 };

  let imported = 0;
  let skipped = 0;
  const clean = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const vendor = r.vendor?.trim();
    const sku = r.sku?.trim();
    const name = r.name?.trim();
    if (!vendor || !sku || !name) {
      skipped++;
      continue;
    }
    const key = `${vendor.toLowerCase()}|${sku.toLowerCase()}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    const cost = num(r.cost);
    clean.push({
      vendor,
      sku,
      name: name.slice(0, 300),
      description: r.description?.trim().slice(0, 1000) || null,
      category: r.category?.trim() || null,
      brand: r.brand?.trim() || null,
      unit: r.unit?.trim() || "each",
      cost,
      url: r.url?.trim() || null,
      last_checked: cost != null ? new Date().toISOString().slice(0, 10) : null,
    });
  }

  for (let i = 0; i < clean.length; i += 500) {
    const { error } = await supabase
      .from("vendor_parts")
      .upsert(clean.slice(i, i + 500), { onConflict: "vendor,sku" });
    if (error) return { error: error.message, imported, skipped };
    imported += Math.min(500, clean.length - i);
  }

  revalidatePath("/app/vendor-parts");
  return { error: null, imported, skipped };
}
