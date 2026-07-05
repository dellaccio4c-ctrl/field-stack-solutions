import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money, subtotal } from "@/lib/money";
import { StatusBadge } from "../status-badge";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, number, title, status, tax_rate, due_date, created_at, customers(name), locations(label), line_items(quantity, unit_price), payments(amount)"
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
          Invoices
        </h1>
        <div className="text-sm text-[#5a6b85]">
          Invoices are created from approved estimates.
        </div>
      </div>

      {!invoices?.length ? (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-10 text-center text-[#5a6b85]">
          No invoices yet. Approve an estimate and convert it to create one.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1]">
                <th className="px-5 py-3.5 font-semibold">#</th>
                <th className="px-5 py-3.5 font-semibold">Title</th>
                <th className="px-5 py-3.5 font-semibold">Customer</th>
                <th className="px-5 py-3.5 font-semibold">Site</th>
                <th className="px-5 py-3.5 font-semibold text-right">Total</th>
                <th className="px-5 py-3.5 font-semibold text-right">Balance</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const sub = subtotal(inv.line_items ?? []);
                const total = sub * (1 + Number(inv.tax_rate));
                const paid = (inv.payments ?? []).reduce(
                  (s: number, p: { amount: number }) => s + Number(p.amount),
                  0
                );
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-[#e4e9f1] last:border-0 hover:bg-[#f5f7fb]"
                  >
                    <td className="px-5 py-3.5 text-[#5a6b85]">
                      INV-{String(inv.number).padStart(4, "0")}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/app/invoices/${inv.id}`}
                        className="font-semibold text-[#0e1726] hover:text-[#b9700f]"
                      >
                        {inv.title || "Untitled"}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[#5a6b85]">
                      {(inv.customers as unknown as { name: string } | null)
                        ?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[#5a6b85]">
                      {(inv.locations as unknown as { label: string } | null)
                        ?.label ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold">
                      {money(total)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold">
                      {money(Math.max(0, total - paid))}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
