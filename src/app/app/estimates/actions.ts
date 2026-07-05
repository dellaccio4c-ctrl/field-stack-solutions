"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createEstimate(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const locationId = String(formData.get("location_id") ?? "");
  const { data, error } = await supabase
    .from("estimates")
    .insert({
      customer_id: String(formData.get("customer_id")),
      location_id: locationId || null,
      title: String(formData.get("title") ?? "").trim(),
      tax_rate: parseFloat(String(formData.get("tax_rate") || "0")) / 100,
      notes: String(formData.get("notes") ?? "").trim() || null,
      created_by: user!.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  redirect(`/app/estimates/${data.id}`);
}

export async function addEstimateItem(estimateId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("line_items").insert({
    estimate_id: estimateId,
    description: String(formData.get("description") ?? "").trim(),
    quantity: parseFloat(String(formData.get("quantity") || "1")),
    unit_price: parseFloat(String(formData.get("unit_price") || "0")),
  });
  if (error) return { error: error.message };
  revalidatePath(`/app/estimates/${estimateId}`);
  return { error: null };
}

export async function deleteEstimateItem(estimateId: string, itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("line_items").delete().eq("id", itemId);
  if (error) return { error: error.message };
  revalidatePath(`/app/estimates/${estimateId}`);
  return { error: null };
}

export async function setEstimateStatus(estimateId: string, status: string) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "sent") patch.sent_at = new Date().toISOString();
  if (status === "approved" || status === "declined")
    patch.decided_at = new Date().toISOString();

  const { error } = await supabase
    .from("estimates")
    .update(patch)
    .eq("id", estimateId);
  if (error) return { error: error.message };
  revalidatePath(`/app/estimates/${estimateId}`);
  revalidatePath("/app/estimates");
  return { error: null };
}

export async function convertToInvoice(estimateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: est, error: estErr } = await supabase
    .from("estimates")
    .select("*, line_items(*)")
    .eq("id", estimateId)
    .single();
  if (estErr || !est) return { error: estErr?.message ?? "Estimate not found" };

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .insert({
      customer_id: est.customer_id,
      location_id: est.location_id,
      estimate_id: est.id,
      title: est.title,
      tax_rate: est.tax_rate,
      notes: est.notes,
      created_by: user!.id,
    })
    .select("id")
    .single();
  if (invErr) return { error: invErr.message };

  if (est.line_items?.length) {
    const { error: itemsErr } = await supabase.from("line_items").insert(
      est.line_items.map(
        (li: {
          description: string;
          quantity: number;
          unit_price: number;
          sort_order: number;
        }) => ({
          invoice_id: inv.id,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          sort_order: li.sort_order,
        })
      )
    );
    if (itemsErr) return { error: itemsErr.message };
  }

  redirect(`/app/invoices/${inv.id}`);
}
