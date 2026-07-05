"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addInvoiceItem(invoiceId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("line_items").insert({
    invoice_id: invoiceId,
    description: String(formData.get("description") ?? "").trim(),
    quantity: parseFloat(String(formData.get("quantity") || "1")),
    unit_price: parseFloat(String(formData.get("unit_price") || "0")),
  });
  if (error) return { error: error.message };
  revalidatePath(`/app/invoices/${invoiceId}`);
  return { error: null };
}

export async function deleteInvoiceItem(invoiceId: string, itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("line_items").delete().eq("id", itemId);
  if (error) return { error: error.message };
  revalidatePath(`/app/invoices/${invoiceId}`);
  return { error: null };
}

export async function setInvoiceStatus(invoiceId: string, status: string) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "sent") patch.sent_at = new Date().toISOString();

  const { error } = await supabase
    .from("invoices")
    .update(patch)
    .eq("id", invoiceId);
  if (error) return { error: error.message };
  revalidatePath(`/app/invoices/${invoiceId}`);
  revalidatePath("/app/invoices");
  return { error: null };
}

export async function emailInvoice(invoiceId: string) {
  const { buildInvoicePdf } = await import("@/lib/pdf/build");
  const { sendDocumentEmail } = await import("@/lib/email");
  const { money } = await import("@/lib/money");

  const doc = await buildInvoicePdf(invoiceId);
  if (!doc) return { error: "Invoice not found" };
  if (!doc.customerEmail)
    return { error: "This customer has no email address on file." };

  const result = await sendDocumentEmail({
    to: doc.customerEmail,
    kind: "Invoice",
    number: doc.number,
    customerName: doc.customerName,
    total: money(doc.total),
    pdf: doc.pdf,
  });
  if (result.error) return { error: result.error };

  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", invoiceId)
    .single();
  if (inv?.status === "draft") await setInvoiceStatus(invoiceId, "sent");
  return { error: null };
}

export async function recordPayment(invoiceId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const amount = parseFloat(String(formData.get("amount") || "0"));
  if (!(amount > 0)) return { error: "Enter a payment amount greater than 0." };

  const { error } = await supabase.from("payments").insert({
    invoice_id: invoiceId,
    amount,
    method: String(formData.get("method") || "other"),
    recorded_by: user!.id,
  });
  if (error) return { error: error.message };

  // Recompute status from total paid vs invoice total.
  const { data: inv } = await supabase
    .from("invoices")
    .select("tax_rate, line_items(quantity, unit_price), payments(amount)")
    .eq("id", invoiceId)
    .single();

  if (inv) {
    const sub = (inv.line_items ?? []).reduce(
      (s: number, i: { quantity: number; unit_price: number }) =>
        s + Number(i.quantity) * Number(i.unit_price),
      0
    );
    const total = sub * (1 + Number(inv.tax_rate));
    const paid = (inv.payments ?? []).reduce(
      (s: number, p: { amount: number }) => s + Number(p.amount),
      0
    );
    const status = paid >= total - 0.005 ? "paid" : "partially_paid";
    await supabase.from("invoices").update({ status }).eq("id", invoiceId);
  }

  revalidatePath(`/app/invoices/${invoiceId}`);
  revalidatePath("/app/invoices");
  return { error: null };
}
