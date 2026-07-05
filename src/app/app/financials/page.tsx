import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { money, subtotal } from "@/lib/money";
import { ExportPanel } from "./export-panel";
import { AddExpenseForm } from "./add-expense-form";

export default async function FinancialsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (me?.role !== "owner") redirect("/app");

  const [{ data: invoices }, { data: payments }, { data: expenses }, { data: customers }, { data: staff }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("status, tax_rate, line_items(quantity, unit_price), payments(amount)"),
      supabase
        .from("payments")
        .select("amount, method, received_at, invoices(number, customers(name))")
        .order("received_at", { ascending: false })
        .limit(8),
      supabase
        .from("expenses")
        .select("amount, description, incurred_at")
        .order("incurred_at", { ascending: false }),
      supabase
        .from("customers")
        .select("id, name, locations(id, label)")
        .order("name"),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .neq("role", "customer")
        .order("full_name"),
    ]);

  let totalRevenue = 0; // money actually received
  let toBeBilled = 0; // draft invoice value
  let outstanding = 0; // sent-but-unpaid balances
  for (const inv of invoices ?? []) {
    const total = subtotal(inv.line_items ?? []) * (1 + Number(inv.tax_rate));
    const paid = (inv.payments ?? []).reduce(
      (s: number, p: { amount: number }) => s + Number(p.amount),
      0
    );
    totalRevenue += paid;
    if (inv.status === "draft") toBeBilled += total;
    else if (inv.status !== "void") outstanding += Math.max(0, total - paid);
  }
  const totalExpenses = (expenses ?? []).reduce(
    (s, e) => s + Number(e.amount),
    0
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
          Financials
        </h1>
        <AddExpenseForm customers={customers ?? []} />
      </div>
      <p className="text-[#5a6b85] mb-6">Owner-only view.</p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Kpi label="Total revenue" value={money(totalRevenue)} accent="#1f9d63" />
        <Kpi label="Incoming (unpaid)" value={money(outstanding)} accent="#2f6fd6" />
        <Kpi label="To be billed" value={money(toBeBilled)} accent="#b9700f" />
        <Kpi label="Outgoing (expenses)" value={money(totalExpenses)} accent="#d24b4b" />
        <Kpi
          label="Net"
          value={money(totalRevenue - totalExpenses)}
          accent={totalRevenue - totalExpenses >= 0 ? "#1f9d63" : "#d24b4b"}
        />
      </div>

      <ExportPanel customers={customers ?? []} staff={staff ?? []} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div>
          <h2 className="text-lg font-extrabold text-[#0e1726] mb-3">
            Recent payments
          </h2>
          <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-hidden">
            {!payments?.length ? (
              <div className="p-6 text-center text-[#5a6b85] text-sm">
                No payments yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={i} className="border-b border-[#e4e9f1] last:border-0">
                      <td className="px-4 py-3 text-[#5a6b85]">
                        {new Date(p.received_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {(
                          p.invoices as unknown as {
                            number: number;
                            customers: { name: string } | null;
                          } | null
                        )?.customers?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 capitalize text-[#5a6b85]">
                        {p.method}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1f9d63]">
                        {money(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-extrabold text-[#0e1726] mb-3">
            Recent expenses
          </h2>
          <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-hidden">
            {!expenses?.length ? (
              <div className="p-6 text-center text-[#5a6b85] text-sm">
                No expenses recorded yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {expenses.slice(0, 8).map((e, i) => (
                    <tr key={i} className="border-b border-[#e4e9f1] last:border-0">
                      <td className="px-4 py-3 text-[#5a6b85]">{e.incurred_at}</td>
                      <td className="px-4 py-3">{e.description}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#d24b4b]">
                        {money(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] p-5 shadow-sm">
      <div className="text-xs font-bold tracking-wider text-[#5a6b85] uppercase mb-1">
        {label}
      </div>
      <div className="text-xl font-extrabold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}
