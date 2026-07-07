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
      is_pumping: formData.get("is_pumping") === "on",
      created_by: user!.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  redirect(`/app/estimates/${data.id}`);
}

export async function addEstimateItem(estimateId: string, formData: FormData) {
  const supabase = await createClient();
  const tier = String(formData.get("option_tier") ?? "");
  const { error } = await supabase.from("line_items").insert({
    estimate_id: estimateId,
    description: String(formData.get("description") ?? "").trim(),
    quantity: parseFloat(String(formData.get("quantity") || "1")),
    unit_price: parseFloat(String(formData.get("unit_price") || "0")),
    option_tier: ["good", "better", "best"].includes(tier) ? tier : null,
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

// Returns an error string when the estimate needs (and lacks) admin approval.
async function checkApprovalGate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  estimateId: string
): Promise<string | null> {
  const { data: settings } = await supabase
    .from("company_settings")
    .select("estimate_approval_threshold")
    .single();
  const threshold = settings?.estimate_approval_threshold;
  if (threshold == null) return null;

  const { data: est } = await supabase
    .from("estimates")
    .select("approval_status, tax_rate, line_items(quantity, unit_price)")
    .eq("id", estimateId)
    .single();
  if (!est) return "Estimate not found";
  if (est.approval_status === "approved") return null;

  const total =
    (est.line_items ?? []).reduce(
      (s: number, i: { quantity: number; unit_price: number }) =>
        s + Number(i.quantity) * Number(i.unit_price),
      0
    ) *
    (1 + Number(est.tax_rate));
  if (total <= Number(threshold)) return null;

  // Over threshold and not yet approved — is the actor senior enough?
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (me && ["admin", "owner"].includes(me.role)) {
    // Admin/Owner sending implicitly approves.
    await supabase
      .from("estimates")
      .update({
        approval_status: "approved",
        approved_by: user!.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", estimateId);
    return null;
  }

  // Flag it pending so admins see it needs sign-off.
  if (est.approval_status !== "pending") {
    await supabase
      .from("estimates")
      .update({ approval_status: "pending" })
      .eq("id", estimateId);
    revalidatePath(`/app/estimates/${estimateId}`);
  }
  return `This estimate exceeds the $${Number(threshold).toLocaleString()} approval threshold — an Admin or Owner must approve it before it can be sent.`;
}

export async function approveEstimate(estimateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (!me || !["admin", "owner"].includes(me.role))
    return { error: "Only Admins and Owners can approve estimates." };

  const { error } = await supabase
    .from("estimates")
    .update({
      approval_status: "approved",
      approved_by: user!.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", estimateId);
  if (error) return { error: error.message };
  revalidatePath(`/app/estimates/${estimateId}`);
  return { error: null };
}

export async function setEstimateStatus(estimateId: string, status: string) {
  const supabase = await createClient();

  if (status === "sent") {
    const gate = await checkApprovalGate(supabase, estimateId);
    if (gate) return { error: gate };
  }

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

// Customer-portal action: RLS only permits this on the customer's own
// estimates while they are in 'sent' status.
export async function customerDecideEstimate(
  estimateId: string,
  decision: "approved" | "declined",
  signature?: { name: string; data: string },
  selectedOption?: string
) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    status: decision,
    decided_at: new Date().toISOString(),
  };
  if (
    decision === "approved" &&
    selectedOption &&
    ["good", "better", "best"].includes(selectedOption)
  )
    patch.selected_option = selectedOption;
  if (decision === "approved" && signature) {
    if (!signature.name.trim())
      return { error: "Please type your name to sign." };
    if (
      !signature.data.startsWith("data:image/png;base64,") ||
      signature.data.length > 200000
    )
      return { error: "Signature didn't capture — please try again." };
    patch.signed_by_name = signature.name.trim().slice(0, 120);
    patch.signature_data = signature.data;
    patch.signed_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from("estimates")
    .update(patch)
    .eq("id", estimateId);
  if (error) return { error: error.message };
  revalidatePath("/app");
  return { error: null };
}

export async function emailEstimate(estimateId: string) {
  // The approval gate applies to emailing too — check BEFORE sending.
  {
    const supabase = await createClient();
    const gate = await checkApprovalGate(supabase, estimateId);
    if (gate) return { error: gate };
  }

  const { buildEstimatePdf } = await import("@/lib/pdf/build");
  const { sendDocumentEmail } = await import("@/lib/email");
  const { money } = await import("@/lib/money");

  const doc = await buildEstimatePdf(estimateId);
  if (!doc) return { error: "Estimate not found" };
  if (!doc.customerEmail)
    return { error: "This customer has no email address on file." };

  const result = await sendDocumentEmail({
    to: doc.customerEmail,
    kind: "Estimate",
    number: doc.number,
    customerName: doc.customerName,
    total: money(doc.total),
    pdf: doc.pdf,
  });
  if (result.error) return { error: result.error };

  await setEstimateStatus(estimateId, "sent");
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
      is_pumping: est.is_pumping,
      created_by: user!.id,
    })
    .select("id")
    .single();
  if (invErr) return { error: invErr.message };

  // With Good/Better/Best, only shared lines + the chosen tier convert.
  const convertibleLines = (est.line_items ?? []).filter(
    (li: { option_tier: string | null }) =>
      !li.option_tier || li.option_tier === est.selected_option
  );
  if (convertibleLines.length) {
    const { error: itemsErr } = await supabase.from("line_items").insert(
      convertibleLines.map(
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
