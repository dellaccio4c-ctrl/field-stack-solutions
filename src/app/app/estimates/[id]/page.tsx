import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { money, subtotal } from "@/lib/money";
import { StatusBadge } from "../../status-badge";
import { LineItemsEditor } from "./line-items-editor";
import { EstimateActions } from "./estimate-actions";
import { BackLink } from "../../back-link";
import { ApprovalBanner } from "./approval-banner";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: est } = await supabase
    .from("estimates")
    .select(
      "*, customers(name), locations(label), line_items(id, description, quantity, unit_price, sort_order)"
    )
    .eq("id", id)
    .single();

  if (!est) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  const canApprove = Boolean(me && ["admin", "owner"].includes(me.role));

  const { data: approver } = est.approved_by
    ? await supabase
        .from("profiles")
        .select("full_name, preferred_name")
        .eq("id", est.approved_by)
        .single()
    : { data: null };

  // If this estimate was converted, link forward to the invoice.
  const { data: resultingInvoice } = await supabase
    .from("invoices")
    .select("id, number")
    .eq("estimate_id", est.id)
    .maybeSingle();

  const { data: catalog } = await supabase
    .from("catalog_items")
    .select("id, name, description, unit_price")
    .eq("is_active", true)
    .order("name");

  const items = (est.line_items ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) =>
      a.sort_order - b.sort_order
  );
  const sub = subtotal(items);
  const tax = sub * Number(est.tax_rate);
  const editable = est.status === "draft";

  return (
    <div>
      <BackLink fallback="/app/estimates" label="All estimates" />

      <div className="flex items-start justify-between mt-2 mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
              EST-{String(est.number).padStart(4, "0")}
            </h1>
            <StatusBadge status={est.status} />
            {est.is_pumping && (
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-[#e8f0fd] text-[#2f6fd6]">
                Pumping
              </span>
            )}
          </div>
          <div className="text-[#0e1726] font-semibold mt-1">{est.title}</div>
          <div className="text-sm text-[#5a6b85]">
            {(est.customers as { name: string } | null)?.name}
            {est.locations
              ? ` — ${(est.locations as { label: string }).label}`
              : ""}
          </div>
          {resultingInvoice && (
            <div className="mt-2">
              <Link
                href={`/app/invoices/${resultingInvoice.id}`}
                className="text-xs font-semibold bg-[#f5f7fb] border border-[#e4e9f1] rounded-full px-2.5 py-1 text-[#5a6b85] hover:border-[#ff8a1e] hover:text-[#b9700f] transition"
              >
                💳 Invoiced as INV-
                {String(resultingInvoice.number).padStart(4, "0")} →
              </Link>
            </div>
          )}
        </div>
        <EstimateActions estimateId={est.id} status={est.status} />
      </div>

      <ApprovalBanner
        estimateId={est.id}
        approvalStatus={est.approval_status}
        approverName={
          approver ? approver.preferred_name || approver.full_name : null
        }
        canApprove={canApprove}
      />

      {est.signed_by_name && (
        <div className="bg-[#e3f6ec] border border-[#bfe6d2] rounded-2xl p-4 mb-6 flex items-center gap-4 flex-wrap">
          <div className="text-sm text-[#0e1726]">
            <span className="font-bold">✓ Signed by {est.signed_by_name}</span>
            {est.signed_at && (
              <span className="text-[#5a6b85]">
                {" "}· {new Date(est.signed_at).toLocaleString()}
              </span>
            )}
          </div>
          {est.signature_data && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={est.signature_data}
              alt={`Signature of ${est.signed_by_name}`}
              className="h-12 bg-white border border-[#e4e9f1] rounded-lg px-2"
            />
          )}
        </div>
      )}

      <LineItemsEditor
        estimateId={est.id}
        items={items}
        editable={editable}
        catalog={catalog ?? []}
      />

      <div className="mt-6 flex justify-end">
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-5 w-72 space-y-2 text-sm shadow-sm">
          <div className="flex justify-between text-[#5a6b85]">
            <span>Subtotal</span>
            <span>{money(sub)}</span>
          </div>
          <div className="flex justify-between text-[#5a6b85]">
            <span>Tax ({(Number(est.tax_rate) * 100).toFixed(2)}%)</span>
            <span>{money(tax)}</span>
          </div>
          <div className="flex justify-between font-extrabold text-[#0e1726] text-base border-t border-[#e4e9f1] pt-2">
            <span>Total</span>
            <span>{money(sub + tax)}</span>
          </div>
        </div>
      </div>

      {est.notes && (
        <div className="bg-[#fff2e3] rounded-2xl p-5 mt-6 text-sm text-[#0e1726]">
          <div className="text-xs font-bold tracking-wider text-[#b9700f] mb-1">
            NOTES
          </div>
          {est.notes}
        </div>
      )}
    </div>
  );
}
