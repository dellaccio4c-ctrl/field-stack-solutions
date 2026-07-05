"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addExpense(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const amount = parseFloat(String(formData.get("amount") || "0"));
  if (!(amount > 0)) return { error: "Enter an amount greater than 0." };

  const customerId = String(formData.get("customer_id") ?? "");
  const locationId = String(formData.get("location_id") ?? "");

  const { error } = await supabase.from("expenses").insert({
    description: String(formData.get("description") ?? "").trim(),
    amount,
    category: String(formData.get("category") ?? "").trim() || null,
    vendor: String(formData.get("vendor") ?? "").trim() || null,
    customer_id: customerId || null,
    location_id: locationId || null,
    incurred_by: user!.id,
    incurred_at: String(formData.get("incurred_at") || new Date().toISOString().slice(0, 10)),
  });
  if (error) return { error: error.message };
  revalidatePath("/app/financials");
  return { error: null };
}
