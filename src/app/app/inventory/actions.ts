"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function fields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") || "part"),
    sku: String(formData.get("sku") ?? "").trim() || null,
    brand: String(formData.get("brand") ?? "").trim() || null,
    model: String(formData.get("model") ?? "").trim() || null,
    serial_number: String(formData.get("serial_number") ?? "").trim() || null,
    min_quantity: Math.max(0, parseInt(String(formData.get("min_quantity") || "0"), 10) || 0),
    unit_cost: formData.get("unit_cost")
      ? parseFloat(String(formData.get("unit_cost")))
      : null,
    storage_location: String(formData.get("storage_location") ?? "").trim() || null,
    assigned_to: String(formData.get("assigned_to") ?? "") || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createInventoryItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const qty = Math.max(0, parseInt(String(formData.get("quantity") || "0"), 10) || 0);
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({ ...fields(formData), quantity: qty })
    .select("id")
    .single();
  if (error) return { error: error.message };

  if (qty > 0) {
    await supabase.from("inventory_movements").insert({
      item_id: data.id,
      delta: qty,
      reason: "Initial stock",
      actor: user!.id,
    });
  }
  revalidatePath("/app/inventory");
  return { error: null };
}

export async function updateInventoryItem(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update(fields(formData))
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/inventory");
  return { error: null };
}

export async function adjustStock(id: string, delta: number, reason: string) {
  if (!delta) return { error: "Enter a quantity change." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: item } = await supabase
    .from("inventory_items")
    .select("quantity")
    .eq("id", id)
    .single();
  if (!item) return { error: "Item not found." };

  const newQty = item.quantity + delta;
  if (newQty < 0)
    return { error: `Only ${item.quantity} in stock — can't remove ${-delta}.` };

  const { error } = await supabase
    .from("inventory_items")
    .update({ quantity: newQty })
    .eq("id", id);
  if (error) return { error: error.message };

  await supabase.from("inventory_movements").insert({
    item_id: id,
    delta,
    reason: reason.trim() || null,
    actor: user!.id,
  });
  revalidatePath("/app/inventory");
  return { error: null };
}

export async function toggleInventoryItem(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/inventory");
  return { error: null };
}
