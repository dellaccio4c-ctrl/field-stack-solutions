import { createClient } from "@/lib/supabase/server";
import { money, subtotal } from "@/lib/money";
import { StatusBadge } from "./status-badge";
import { CustomerEstimateButtons } from "./customer-estimate-buttons";

export async function CustomerDashboard({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const supabase = await createClient();

  const [{ data: estimates }, { data: invoices }, { data: locations }] =
    await Promise.all([
      supabase
        .from("estimates")
        .select("id, number, title, status, tax_rate, locations(label), line_items(quantity, unit_price)")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("invoices")
        .select(
          "id, number, title, status, tax_rate, location_id, locations(label), line_items(quantity, unit_price), payments(amount)"
        )
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("locations")
        .select("id, label, address")
        .eq("customer_id", customerId)
        .order("label"),
    ]);

  // Per-site totals
  const siteTotals = new Map<
    string,
    { label: string; billed: number; paid: number }
  >();
  for (const loc of locations ?? []) {
    siteTotals.set(loc.id, { label: loc.label, billed: 0, paid: 0 });
  }
  const noSite = { label: "(no site specified)", billed: 0, paid: 0 };
  for (const inv of invoices ?? []) {
    if (inv.status === "void" || inv.status === "draft") continue;
    const total = subtotal(inv.line_items ?? []) * (1 + Number(inv.tax_rate));
    const paid = (inv.payments ?? []).reduce(
      (s: number, p: { amount: number }) => s + Number(p.amount),
      0
    );
    const bucket =
      (inv.location_id && siteTotals.get(inv.location_id)) || noSite;
    bucket.billed += total;
    bucket.paid += paid;
  }

  const pendingEstimates = (estimates ?? []).filter(
    (e) => e.status === "sent"
  );
  const openInvoices = (invoices ?? []).filter(
    (i) => !["paid", "void", "draft"].includes(i.status)
  );

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726] mb-2">
        Welcome, {customerName}
      </h1>
      <p className="text-[#5a6b85] mb-8">
        Your estimates, invoices, and site history in one place.
      </p>

      {pendingEstimates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-extrabold text-[#0e1726] mb-3">
            Estimates awaiting your approval
          </h2>
          <div className="space-y-3">
            {pendingEstimates.map((e) => {
              const total =
                subtotal(e.line_items ?? []) * (1 + Number(e.tax_rate));
              return (
                <div
                  key={e.id}
                  className="bg-white rounded-2xl border-2 border-[#ff8a1e]/40 p-5 shadow-sm flex items-center justify-between flex-wrap gap-3"
                >
                  <div>
                    <div className="font-bold text-[#0e1726]">
                      EST-{String(e.number).padStart(4, "0")} — {e.title}
                    </div>
                    <div className="text-sm text-[#5a6b85]">
                      {(e.locations as unknown as { label: string } | null)
                        ?.label ?? ""}{" "}
                      · {money(total)}
                    </div>
                  </div>
                  <CustomerEstimateButtons estimateId={e.id} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-extrabold text-[#0e1726] mb-3">
            Open invoices
          </h2>
          <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-hidden">
            {!openInvoices.length ? (
              <div className="p-6 text-center text-[#5a6b85] text-sm">
                No open invoices — you&apos;re all caught up.
              </div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {openInvoices.map((inv) => {
                    const total =
                      subtotal(inv.line_items ?? []) *
                      (1 + Number(inv.tax_rate));
                    const paid = (inv.payments ?? []).reduce(
                      (s: number, p: { amount: number }) => s + Number(p.amount),
                      0
                    );
                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-[#e4e9f1] last:border-0"
                      >
                        <td className="px-4 py-3 font-semibold">
                          INV-{String(inv.number).padStart(4, "0")}
                        </td>
                        <td className="px-4 py-3 text-[#5a6b85]">
                          {(inv.locations as unknown as { label: string } | null)
                            ?.label ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {money(Math.max(0, total - paid))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={`/app/invoices/${inv.id}/pay`}
                            className="bg-[#1f9d63] hover:opacity-90 text-white font-semibold rounded-lg px-3 py-1.5 text-xs transition"
                          >
                            Pay now
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-extrabold text-[#0e1726] mb-3">
            Totals by site
          </h2>
          <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1] bg-[#f5f7fb]">
                  <th className="px-4 py-3 font-semibold">Site</th>
                  <th className="px-4 py-3 font-semibold text-right">Billed</th>
                  <th className="px-4 py-3 font-semibold text-right">Paid</th>
                  <th className="px-4 py-3 font-semibold text-right">Owed</th>
                </tr>
              </thead>
              <tbody>
                {[...siteTotals.values(), ...(noSite.billed ? [noSite] : [])].map(
                  (s, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#e4e9f1] last:border-0"
                    >
                      <td className="px-4 py-3 font-semibold">{s.label}</td>
                      <td className="px-4 py-3 text-right">{money(s.billed)}</td>
                      <td className="px-4 py-3 text-right text-[#1f9d63]">
                        {money(s.paid)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {money(Math.max(0, s.billed - s.paid))}
                      </td>
                    </tr>
                  )
                )}
                {!siteTotals.size && !noSite.billed && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-[#5a6b85]"
                    >
                      No billing history yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
