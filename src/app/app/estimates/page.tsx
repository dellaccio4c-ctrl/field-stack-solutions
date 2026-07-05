import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money, subtotal } from "@/lib/money";
import { StatusBadge } from "../status-badge";

export default async function EstimatesPage() {
  const supabase = await createClient();
  const { data: estimates } = await supabase
    .from("estimates")
    .select(
      "id, number, title, status, tax_rate, created_at, customers(name), locations(label), line_items(quantity, unit_price)"
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
          Estimates
        </h1>
        <Link
          href="/app/estimates/new"
          className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2.5 transition"
        >
          + New Estimate
        </Link>
      </div>

      {!estimates?.length ? (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-10 text-center text-[#5a6b85]">
          No estimates yet.
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
                <th className="px-5 py-3.5 font-semibold">Total</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {estimates.map((e) => {
                const sub = subtotal(e.line_items ?? []);
                const total = sub * (1 + Number(e.tax_rate));
                return (
                  <tr
                    key={e.id}
                    className="border-b border-[#e4e9f1] last:border-0 hover:bg-[#f5f7fb]"
                  >
                    <td className="px-5 py-3.5 text-[#5a6b85]">
                      EST-{String(e.number).padStart(4, "0")}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/app/estimates/${e.id}`}
                        className="font-semibold text-[#0e1726] hover:text-[#b9700f]"
                      >
                        {e.title || "Untitled"}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[#5a6b85]">
                      {(e.customers as unknown as { name: string } | null)
                        ?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[#5a6b85]">
                      {(e.locations as unknown as { label: string } | null)
                        ?.label ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 font-semibold">{money(total)}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={e.status} />
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
