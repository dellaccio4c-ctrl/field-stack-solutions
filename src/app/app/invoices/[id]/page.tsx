import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { money, subtotal } from "@/lib/money";
import { StatusBadge } from "../../status-badge";
import { InvoiceItemsEditor } from "./invoice-items-editor";
import { InvoiceActions } from "./invoice-actions";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: inv } = await supabase
    .from("invoices")
    .select(
      "*, customers(name), locations(label), line_items(id, description, quantity, unit_price, sort_order), payments(id, amount, method, received_at)"
    )
    .eq("id", id)
    .single();

  if (!inv) notFound();

  const items = (inv.line_items ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) =>
      a.sort_order - b.sort_order
  );
  const sub = subtotal(items);
  const tax = sub * Number(inv.tax_rate);
  const total = sub + tax;
  const paid = (inv.payments ?? []).reduce(
    (s: number, p: { amount: number }) => s + Number(p.amount),
    0
  );
  const editable = inv.status === "draft";

  return (
    <div>
      <Link
        href="/app/invoices"
        className="text-sm text-[#5a6b85] hover:text-[#b9700f]"
      >
        ← All invoices
      </Link>

      <div className="flex items-start justify-between mt-2 mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
              INV-{String(inv.number).padStart(4, "0")}
            </h1>
            <StatusBadge status={inv.status} />
          </div>
          <div className="text-[#0e1726] font-semibold mt-1">{inv.title}</div>
          <div className="text-sm text-[#5a6b85]">
            {(inv.customers as { name: string } | null)?.name}
            {inv.locations
              ? ` — ${(inv.locations as { label: string }).label}`
              : ""}
          </div>
        </div>
        <InvoiceActions
          invoiceId={inv.id}
          status={inv.status}
          balance={Math.max(0, total - paid)}
        />
      </div>

      <InvoiceItemsEditor invoiceId={inv.id} items={items} editable={editable} />

      <div className="mt-6 flex justify-end">
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-5 w-72 space-y-2 text-sm shadow-sm">
          <div className="flex justify-between text-[#5a6b85]">
            <span>Subtotal</span>
            <span>{money(sub)}</span>
          </div>
          <div className="flex justify-between text-[#5a6b85]">
            <span>Tax ({(Number(inv.tax_rate) * 100).toFixed(2)}%)</span>
            <span>{money(tax)}</span>
          </div>
          <div className="flex justify-between font-extrabold text-[#0e1726] text-base border-t border-[#e4e9f1] pt-2">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
          <div className="flex justify-between text-[#1f9d63] font-semibold">
            <span>Paid</span>
            <span>{money(paid)}</span>
          </div>
          <div className="flex justify-between font-extrabold text-[#0e1726]">
            <span>Balance due</span>
            <span>{money(Math.max(0, total - paid))}</span>
          </div>
        </div>
      </div>

      {inv.payments?.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-extrabold text-[#0e1726] mb-3">
            Payment history
          </h2>
          <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1] bg-[#f5f7fb]">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Method</th>
                  <th className="px-5 py-3 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.payments.map(
                  (p: {
                    id: string;
                    amount: number;
                    method: string;
                    received_at: string;
                  }) => (
                    <tr
                      key={p.id}
                      className="border-b border-[#e4e9f1] last:border-0"
                    >
                      <td className="px-5 py-3">
                        {new Date(p.received_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 capitalize">{p.method}</td>
                      <td className="px-5 py-3 text-right font-semibold">
                        {money(p.amount)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {inv.notes && (
        <div className="bg-[#fff2e3] rounded-2xl p-5 mt-6 text-sm text-[#0e1726]">
          <div className="text-xs font-bold tracking-wider text-[#b9700f] mb-1">
            NOTES
          </div>
          {inv.notes}
        </div>
      )}
    </div>
  );
}
