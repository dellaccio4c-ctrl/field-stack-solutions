"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    name: String(formData.get("name") ?? "").trim(),
    contact_name: String(formData.get("contact_name") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    billing_address: String(formData.get("billing_address") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/app/customers");
  return { error: null };
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      contact_name: String(formData.get("contact_name") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      billing_address: String(formData.get("billing_address") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/customers");
  revalidatePath(`/app/customers/${id}`);
  return { error: null };
}

export async function createLocation(customerId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("locations").insert({
    customer_id: customerId,
    label: String(formData.get("label") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim() || null,
    state: String(formData.get("state") ?? "").trim() || null,
    zip: String(formData.get("zip") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/app/customers/${customerId}`);
  return { error: null };
}

export async function deleteLocation(customerId: string, locationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("locations")
    .delete()
    .eq("id", locationId);
  if (error) return { error: error.message };
  revalidatePath(`/app/customers/${customerId}`);
  return { error: null };
}
