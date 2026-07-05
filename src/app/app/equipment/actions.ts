"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function fields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim() || null,
    brand: String(formData.get("brand") ?? "").trim() || null,
    model: String(formData.get("model") ?? "").trim() || null,
    serial_number: String(formData.get("serial_number") ?? "").trim() || null,
    unit_number: String(formData.get("unit_number") ?? "").trim() || null,
    install_date: String(formData.get("install_date") || "") || null,
    warranty_expires: String(formData.get("warranty_expires") || "") || null,
    pm_interval_months: formData.get("pm_interval_months")
      ? parseInt(String(formData.get("pm_interval_months")), 10) || null
      : null,
    pm_window_days: Math.max(
      0,
      parseInt(String(formData.get("pm_window_days") || "14"), 10) || 14
    ),
    customer_id: String(formData.get("customer_id") ?? "") || null,
    location_id: String(formData.get("location_id") ?? "") || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createEquipment(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("equipment").insert(fields(formData));
  if (error) return { error: error.message };
  revalidatePath("/app/equipment");
  return { error: null };
}

export async function updateEquipment(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("equipment")
    .update(fields(formData))
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/equipment");
  revalidatePath(`/app/equipment/${id}`);
  return { error: null };
}

export async function setEquipmentStatus(id: string, status: "active" | "retired") {
  const supabase = await createClient();
  const { error } = await supabase
    .from("equipment")
    .update({ status })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/equipment");
  revalidatePath(`/app/equipment/${id}`);
  return { error: null };
}
