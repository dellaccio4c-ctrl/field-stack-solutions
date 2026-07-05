"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Free OpenStreetMap geocoder (1 req/sec limit — we respect it).
async function geocode(address: string) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(address)}`,
      { headers: { "User-Agent": "FieldStackSolutions/1.0 (info@fieldstacksolutions.com)" } }
    );
    if (!res.ok) return null;
    const results = (await res.json()) as { lat: string; lon: string }[];
    if (!results.length) return null;
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

export async function createPumpSite(formData: FormData) {
  const supabase = await createClient();
  const address = String(formData.get("address") ?? "").trim();
  const coords = await geocode(address);
  const { error } = await supabase.from("pump_sites").insert({
    client_name: String(formData.get("client_name") ?? "").trim(),
    site_label: String(formData.get("site_label") ?? "").trim() || null,
    address,
    interval_months: parseInt(String(formData.get("interval_months") || "6"), 10),
    window_days: parseInt(String(formData.get("window_days") || "14"), 10),
    last_pumped: String(formData.get("last_pumped") || "") || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/app/dev/pump");
  return { error: null };
}

type ImportRow = {
  client_name: string;
  site_label?: string;
  address: string;
  interval_months?: number;
  window_days?: number;
  last_pumped?: string;
  notes?: string;
};

export async function importPumpSites(rows: ImportRow[]) {
  if (!rows.length) return { error: "No rows to import.", imported: 0 };
  if (rows.length > 500)
    return { error: "Import is limited to 500 rows at a time.", imported: 0 };

  const supabase = await createClient();
  const clean = rows
    .filter((r) => r.client_name?.trim() && r.address?.trim())
    .map((r) => ({
      client_name: String(r.client_name).trim(),
      site_label: r.site_label ? String(r.site_label).trim() : null,
      address: String(r.address).trim(),
      interval_months: Math.max(1, parseInt(String(r.interval_months || 6), 10) || 6),
      window_days: Math.max(0, parseInt(String(r.window_days ?? 14), 10) || 14),
      last_pumped: r.last_pumped ? String(r.last_pumped).slice(0, 10) : null,
      notes: r.notes ? String(r.notes).trim() : null,
    }));

  if (!clean.length)
    return { error: "No valid rows — each row needs a client name and address.", imported: 0 };

  const { error } = await supabase.from("pump_sites").insert(clean);
  if (error) return { error: error.message, imported: 0 };

  revalidatePath("/app/dev/pump");
  return { error: null, imported: clean.length };
}

// Geocode up to 12 sites missing map pins (respects the 1 req/sec limit).
export async function locateMissingPins() {
  const supabase = await createClient();
  const { data: missing } = await supabase
    .from("pump_sites")
    .select("id, address")
    .is("lat", null)
    .eq("is_active", true)
    .limit(12);

  if (!missing?.length) return { error: null, located: 0, remaining: 0 };

  let located = 0;
  for (const site of missing) {
    const coords = await geocode(site.address);
    if (coords) {
      await supabase
        .from("pump_sites")
        .update({ lat: coords.lat, lng: coords.lng })
        .eq("id", site.id);
      located++;
    }
    await new Promise((r) => setTimeout(r, 1100));
  }

  const { count } = await supabase
    .from("pump_sites")
    .select("id", { count: "exact", head: true })
    .is("lat", null)
    .eq("is_active", true);

  revalidatePath("/app/dev/pump");
  return { error: null, located, remaining: count ?? 0 };
}

export async function updatePumpSite(id: string, formData: FormData) {
  const supabase = await createClient();
  const address = String(formData.get("address") ?? "").trim();
  const coords = await geocode(address);
  const { error } = await supabase
    .from("pump_sites")
    .update({
      client_name: String(formData.get("client_name") ?? "").trim(),
      site_label: String(formData.get("site_label") ?? "").trim() || null,
      address,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      interval_months: parseInt(String(formData.get("interval_months") || "6"), 10),
      window_days: parseInt(String(formData.get("window_days") || "14"), 10),
      last_pumped: String(formData.get("last_pumped") || "") || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/dev/pump");
  return { error: null };
}

export async function markPumped(id: string, date: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pump_sites")
    .update({ last_pumped: date })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/dev/pump");
  return { error: null };
}

export async function togglePumpSite(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pump_sites")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/dev/pump");
  return { error: null };
}
