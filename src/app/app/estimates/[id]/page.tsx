import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { money, subtotal } from "@/lib/money";
import { StatusBadge } from "../../status-badge";
import { LineItemsEditor } from "./line-items-editor";
import { EstimateActions } from "./estimate-actions";

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
      <Link
        href="/app/estimates"
        className="text-sm text-[#5a6b85] hover:text-[#b9700f]"
      >
        ← All estimates
      </Link>

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
        </div>
        <EstimateActions estimateId={est.id} status={est.status} />
      </div>

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
