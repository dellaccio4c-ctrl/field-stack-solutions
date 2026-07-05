import { createClient } from "@/lib/supabase/server";
import { renderDocumentPdf } from "./document";
import { subtotal } from "@/lib/money";

type Loc = {
  label: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
} | null;

function siteAddress(loc: Loc) {
  return loc
    ? [loc.address, [loc.city, loc.state].filter(Boolean).join(", "), loc.zip]
        .filter(Boolean)
        .join(", ")
    : null;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function buildEstimatePdf(id: string) {
  const supabase = await createClient();
  const { data: est } = await supabase
    .from("estimates")
    .select(
      "*, customers(name, email), locations(label, address, city, state, zip), line_items(description, quantity, unit_price, sort_order)"
    )
    .eq("id", id)
    .single();
  if (!est) return null;

  const customer = est.customers as unknown as {
    name: string;
    email: string | null;
  } | null;
  const loc = est.locations as unknown as Loc;
  const items = (est.line_items ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) =>
      a.sort_order - b.sort_order
  );
  const number = `EST-${String(est.number).padStart(4, "0")}`;
  const total = subtotal(items) * (1 + Number(est.tax_rate));

  const pdf = await renderDocumentPdf({
    kind: "ESTIMATE",
    number,
    date: fmtDate(est.created_at),
    customerName: customer?.name ?? "",
    siteLabel: loc?.label ?? null,
    siteAddress: siteAddress(loc),
    title: est.title,
    items,
    taxRate: Number(est.tax_rate),
    notes: est.notes,
  });

  return {
    pdf,
    number,
    total,
    customerName: customer?.name ?? "",
    customerEmail: customer?.email ?? null,
  };
}

export async function buildInvoicePdf(id: string) {
  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select(
      "*, customers(name, email), locations(label, address, city, state, zip), line_items(description, quantity, unit_price, sort_order), payments(amount)"
    )
    .eq("id", id)
    .single();
  if (!inv) return null;

  const customer = inv.customers as unknown as {
    name: string;
    email: string | null;
  } | null;
  const loc = inv.locations as unknown as Loc;
  const items = (inv.line_items ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) =>
      a.sort_order - b.sort_order
  );
  const paid = (inv.payments ?? []).reduce(
    (s: number, p: { amount: number }) => s + Number(p.amount),
    0
  );
  const number = `INV-${String(inv.number).padStart(4, "0")}`;
  const total = subtotal(items) * (1 + Number(inv.tax_rate));

  const pdf = await renderDocumentPdf({
    kind: "INVOICE",
    number,
    date: fmtDate(inv.created_at),
    customerName: customer?.name ?? "",
    siteLabel: loc?.label ?? null,
    siteAddress: siteAddress(loc),
    title: inv.title,
    items,
    taxRate: Number(inv.tax_rate),
    amountPaid: paid,
    notes: inv.notes,
  });

  return {
    pdf,
    number,
    total,
    customerName: customer?.name ?? "",
    customerEmail: customer?.email ?? null,
  };
}
