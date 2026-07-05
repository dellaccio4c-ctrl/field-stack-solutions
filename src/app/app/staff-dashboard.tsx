import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { slaState } from "@/lib/sla";
import { money, subtotal } from "@/lib/money";
import { atLeast, type UserRole } from "@/lib/roles";

const OPEN_WO = ["open", "scheduled", "in_progress", "on_hold"];

export async function StaffDashboard({
  role,
  displayName,
}: {
  role: UserRole;
  displayName: string;
}) {
  const supabase = await createClient();

  const [
    { data: openWOs },
    { count: newLeads },
    { data: sentEstimates },
    { data: openInvoices },
    { data: lowStock },
  ] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id, priority, status, created_at, started_at, completed_at")
      .in("status", OPEN_WO),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("estimates")
      .select("id, tax_rate, line_items(quantity, unit_price)")
      .eq("status", "sent"),
    supabase
      .from("invoices")
      .select("id, tax_rate, line_items(quantity, unit_price), payments(amount)")
      .in("status", ["sent", "partially_paid", "overdue"]),
    supabase
      .from("inventory_items")
      .select("id, quantity, min_quantity")
      .eq("is_active", true)
      .gt("min_quantity", 0),
  ]);

  const slaBreaches = (openWOs ?? []).filter(
    (wo) => slaState(wo)?.status === "breached"
  ).length;

  const pendingEstimateValue = (sentEstimates ?? []).reduce(
    (s, e) => s + subtotal(e.line_items ?? []) * (1 + Number(e.tax_rate)),
    0
  );

  const outstanding = (openInvoices ?? []).reduce((s, inv) => {
    const total = subtotal(inv.line_items ?? []) * (1 + Number(inv.tax_rate));
    const paid = (inv.payments ?? []).reduce(
      (p: number, x: { amount: number }) => p + Number(x.amount),
      0
    );
    return s + Math.max(0, total - paid);
  }, 0);

  const lowStockCount = (lowStock ?? []).filter(
    (i) => i.quantity <= i.min_quantity
  ).length;

  const cards: {
    label: string;
    value: string;
    sub: string;
    href: string;
    alert?: boolean;
    min: UserRole;
  }[] = [
    {
      label: "Open work orders",
      value: String(openWOs?.length ?? 0),
      sub:
        slaBreaches > 0
          ? `${slaBreaches} SLA breach${slaBreaches === 1 ? "" : "es"}!`
          : "all within SLA",
      href: "/app/work-orders",
      alert: slaBreaches > 0,
      min: "field",
    },
    {
      label: "New leads",
      value: String(newLeads ?? 0),
      sub: "awaiting first contact",
      href: "/app/leads",
      alert: (newLeads ?? 0) > 0,
      min: "field",
    },
    {
      label: "Estimates awaiting approval",
      value: String(sentEstimates?.length ?? 0),
      sub: money(pendingEstimateValue) + " pending",
      href: "/app/estimates",
      min: "readonly",
    },
    {
      label: "Unpaid invoices",
      value: String(openInvoices?.length ?? 0),
      sub: money(outstanding) + " outstanding",
      href: "/app/invoices",
      min: "readonly",
    },
    {
      label: "Low stock items",
      value: String(lowStockCount),
      sub: lowStockCount > 0 ? "reorder needed" : "stock levels OK",
      href: "/app/inventory?low=1",
      alert: lowStockCount > 0,
      min: "field",
    },
  ];

  const visible = cards.filter((c) => atLeast(role, c.min));

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726] mb-2">
        Welcome back, {displayName}
      </h1>
      <p className="text-[#5a6b85] mb-8">
        Here&apos;s where things stand right now.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`bg-white rounded-2xl border p-5 shadow-sm transition hover:border-[#ff8a1e] ${
              c.alert ? "border-[#ff8a1e]/60" : "border-[#e4e9f1]"
            }`}
          >
            <div className="text-xs font-bold tracking-wider text-[#5a6b85] uppercase mb-1">
              {c.label}
            </div>
            <div className="text-3xl font-extrabold text-[#0e1726]">
              {c.value}
            </div>
            <div
              className={`text-sm mt-1 ${
                c.alert ? "text-[#b9700f] font-semibold" : "text-[#5a6b85]"
              }`}
            >
              {c.sub}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
