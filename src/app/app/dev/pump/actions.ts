"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createPumpSite(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("pump_sites").insert({
    client_name: String(formData.get("client_name") ?? "").trim(),
    site_label: String(formData.get("site_label") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim(),
    interval_months: parseInt(String(formData.get("interval_months") || "6"), 10),
    window_days: parseInt(String(formData.get("window_days") || "14"), 10),
    last_pumped: String(formData.get("last_pumped") || "") || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/app/dev/pump");
  return { error: null };
}

export async function updatePumpSite(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pump_sites")
    .update({
      client_name: String(formData.get("client_name") ?? "").trim(),
      site_label: String(formData.get("site_label") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim(),
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
