import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { money, subtotal } from "@/lib/money";
import { ExportPanel } from "./export-panel";
import { AddExpenseForm } from "./add-expense-form";
import { ApprovalSettings } from "./approval-settings";

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
  const isXpress = me?.role === "xpress_pumping";
  if (me?.role !== "owner" && !isXpress) redirect("/app");

  const { data: settings } = await supabase
    .from("company_settings")
    .select("estimate_approval_threshold")
    .single();

  const [
    { data: invoices },
    { data: payments },
    { data: expenses },
    { data: customers },
    { data: staff },
    { data: externalSales },
    { data: integrations },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("status, tax_rate, line_items(quantity, unit_price), payments(amount)"),
    supabase
      .from("payments")
      .select("amount, method, received_at, invoices(number, customers(name))")
      .order("received_at", { ascending: false }),
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
    supabase.from("external_sales").select("amount, occurred_on"),
    supabase
      .from("integrations")
      .select("id, name, status")
      .eq("is_active", true),
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

  // Operator metrics: month-to-date / year-to-date, POS sales, and a
  // 6-month revenue-vs-expense trend across every income source.
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const inRange = (d: string | Date, from: Date) => new Date(d) >= from;

  const paidMTD = (payments ?? [])
    .filter((p) => inRange(p.received_at, monthStart))
    .reduce((s, p) => s + Number(p.amount), 0);
  const paidYTD = (payments ?? [])
    .filter((p) => inRange(p.received_at, yearStart))
    .reduce((s, p) => s + Number(p.amount), 0);
  const expMTD = (expenses ?? [])
    .filter((e) => inRange(e.incurred_at, monthStart))
    .reduce((s, e) => s + Number(e.amount), 0);
  const posTotal = (externalSales ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const posMTD = (externalSales ?? [])
    .filter((e) => inRange(e.occurred_on, monthStart))
    .reduce((s, e) => s + Number(e.amount), 0);

  const months: { key: string; label: string; revenue: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-US", { month: "short" }),
      revenue: 0,
      expense: 0,
    });
  }
  const bucket = (d: string) => {
    const dt = new Date(d);
    return months.find(
      (m) => m.key === `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
    );
  };
  for (const p of payments ?? []) {
    const b = bucket(p.received_at);
    if (b) b.revenue += Number(p.amount);
  }
  for (const e of externalSales ?? []) {
    const b = bucket(e.occurred_on);
    if (b) b.revenue += Number(e.amount);
  }
  for (const e of expenses ?? []) {
    const b = bucket(e.incurred_at);
    if (b) b.expense += Number(e.amount);
  }
  const maxBar = Math.max(1, ...months.map((m) => Math.max(m.revenue, m.expense)));

  const byCustomer = new Map<string, number>();
  for (const p of payments ?? []) {
    const name =
      (p.invoices as unknown as { customers: { name: string } | null } | null)
        ?.customers?.name ?? "Unassigned";
    byCustomer.set(name, (byCustomer.get(name) ?? 0) + Number(p.amount));
  }
  const topCustomers = [...byCustomer.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const connectedCount = (integrations ?? []).filter(
    (i) => i.status === "connected"
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
          {isXpress ? "Pumping Financials" : "Financials"}
        </h1>
        {!isXpress && <AddExpenseForm customers={customers ?? []} />}
      </div>
      <p className="text-[#5a6b85] mb-6">
        {isXpress
          ? "Pumping-division invoices, payments, and expenses."
          : "Owner-only view."}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        <Kpi label="Total revenue" value={money(totalRevenue + posTotal)} accent="#1f9d63" />
        <Kpi label="Incoming (unpaid)" value={money(outstanding)} accent="#2f6fd6" />
        <Kpi label="To be billed" value={money(toBeBilled)} accent="#b9700f" />
        <Kpi label="Outgoing (expenses)" value={money(totalExpenses)} accent="#d24b4b" />
        <Kpi
          label="Net"
          value={money(totalRevenue + posTotal - totalExpenses)}
          accent={totalRevenue + posTotal - totalExpenses >= 0 ? "#1f9d63" : "#d24b4b"}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Kpi label="Revenue MTD" value={money(paidMTD + posMTD)} accent="#1f9d63" />
        <Kpi label="Revenue YTD" value={money(paidYTD + posTotal)} accent="#1f9d63" />
        <Kpi label="Expenses MTD" value={money(expMTD)} accent="#d24b4b" />
        <Kpi label="POS / external sales" value={money(posTotal)} accent="#7c5cd6" />
        <Kpi
          label="Sales systems"
          value={`${connectedCount} connected`}
          accent={connectedCount > 0 ? "#1f9d63" : "#5a6b85"}
          href="/app/integrations"
        />
      </div>

      {!isXpress && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm p-5">
            <h2 className="text-sm font-bold tracking-wider text-[#5a6b85] uppercase mb-4">
              Revenue vs expenses — last 6 months
            </h2>
            <div className="flex items-end gap-3 h-40">
              {months.map((m) => (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex items-end gap-1 w-full h-32 justify-center">
                    <div
                      title={`Revenue ${money(m.revenue)}`}
                      className="w-1/3 rounded-t bg-[#1f9d63]"
                      style={{ height: `${(m.revenue / maxBar) * 100}%`, minHeight: m.revenue > 0 ? 3 : 0 }}
                    />
                    <div
                      title={`Expenses ${money(m.expense)}`}
                      className="w-1/3 rounded-t bg-[#d24b4b]"
                      style={{ height: `${(m.expense / maxBar) * 100}%`, minHeight: m.expense > 0 ? 3 : 0 }}
                    />
                  </div>
                  <div className="text-xs text-[#5a6b85]">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-[#5a6b85]">
              <span><span className="inline-block w-3 h-3 rounded bg-[#1f9d63] align-middle mr-1" />Revenue (invoices + POS)</span>
              <span><span className="inline-block w-3 h-3 rounded bg-[#d24b4b] align-middle mr-1" />Expenses</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm p-5">
            <h2 className="text-sm font-bold tracking-wider text-[#5a6b85] uppercase mb-4">
              Top customers by collected revenue
            </h2>
            {!topCustomers.length ? (
              <div className="text-sm text-[#5a6b85]">No payments yet.</div>
            ) : (
              <div className="space-y-3">
                {topCustomers.map(([name, amt]) => (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-[#0e1726]">{name}</span>
                      <span className="text-[#1f9d63] font-semibold">{money(amt)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#eef1f6]">
                      <div
                        className="h-2 rounded-full bg-[#ff8a1e]"
                        style={{ width: `${(amt / topCustomers[0][1]) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ExportPanel customers={customers ?? []} staff={staff ?? []} />

      {!isXpress && (
        <ApprovalSettings
          currentThreshold={settings?.estimate_approval_threshold ?? null}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div>
          <h2 className="text-lg font-extrabold text-[#0e1726] mb-3">
            Recent payments
          </h2>
          <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
            {!payments?.length ? (
              <div className="p-6 text-center text-[#5a6b85] text-sm">
                No payments yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {payments.slice(0, 8).map((p, i) => (
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
          <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
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
  href,
}: {
  label: string;
  value: string;
  accent: string;
  href?: string;
}) {
  const card = (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] p-5 shadow-sm h-full hover:border-[#ff8a1e] transition">
      <div className="text-xs font-bold tracking-wider text-[#5a6b85] uppercase mb-1">
        {label}
      </div>
      <div className="text-xl font-extrabold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}
