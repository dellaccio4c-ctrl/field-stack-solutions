"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCatalogItem(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("catalog_items").insert({
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    unit_price: parseFloat(String(formData.get("unit_price") || "0")),
  });
  if (error) return { error: error.message };
  revalidatePath("/app/catalog");
  return { error: null };
}

export async function updateCatalogItem(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("catalog_items")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      unit_price: parseFloat(String(formData.get("unit_price") || "0")),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/catalog");
  return { error: null };
}

export async function toggleCatalogItem(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("catalog_items")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/catalog");
  return { error: null };
}
