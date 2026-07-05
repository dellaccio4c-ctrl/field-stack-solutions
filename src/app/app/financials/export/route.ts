import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { subtotal } from "@/lib/money";

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]) {
  return [
    headers.join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ].join("\r\n");
}

// Owner-only export endpoint (RLS also protects the underlying data).
// Query params:
//   type=sales|expenses
//   customer_ids=a,b,c   location_ids=a,b,c   user_id=<uuid>
//   from=YYYY-MM-DD      to=YYYY-MM-DD
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "owner")
    return NextResponse.json({ error: "Owner access required" }, { status: 403 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "sales";
  const customerIds =
    url.searchParams.get("customer_ids")?.split(",").filter(Boolean) ?? [];
  const locationIds =
    url.searchParams.get("location_ids")?.split(",").filter(Boolean) ?? [];
  const userId = url.searchParams.get("user_id") || null;
  const from = url.searchParams.get("from") || null;
  const to = url.searchParams.get("to") || null;

  let csv: string;
  let filename: string;

  if (type === "expenses") {
    let q = supabase
      .from("expenses")
      .select(
        "description, amount, category, vendor, incurred_at, customers(name), locations(label), profiles!expenses_incurred_by_fkey(full_name, email)"
      )
      .order("incurred_at", { ascending: false });
    if (customerIds.length) q = q.in("customer_id", customerIds);
    if (locationIds.length) q = q.in("location_id", locationIds);
    if (userId) q = q.eq("incurred_by", userId);
    if (from) q = q.gte("incurred_at", from);
    if (to) q = q.lte("incurred_at", to);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    csv = toCsv(
      ["Date", "Description", "Category", "Vendor", "Customer", "Site", "Entered by", "Amount"],
      (data ?? []).map((e) => [
        e.incurred_at,
        e.description,
        e.category ?? "",
        e.vendor ?? "",
        (e.customers as unknown as { name: string } | null)?.name ?? "",
        (e.locations as unknown as { label: string } | null)?.label ?? "",
        (e.profiles as unknown as { full_name: string; email: string } | null)
          ?.full_name ?? "",
        Number(e.amount).toFixed(2),
      ])
    );
    filename = "expenses";
  } else {
    let q = supabase
      .from("invoices")
      .select(
        "number, title, status, tax_rate, created_at, customers(name), locations(label), profiles!invoices_created_by_fkey(full_name), line_items(quantity, unit_price), payments(amount)"
      )
      .order("created_at", { ascending: false });
    if (customerIds.length) q = q.in("customer_id", customerIds);
    if (locationIds.length) q = q.in("location_id", locationIds);
    if (userId) q = q.eq("created_by", userId);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", `${to}T23:59:59`);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    csv = toCsv(
      ["Invoice #", "Date", "Title", "Customer", "Site", "Created by", "Status", "Total", "Paid", "Balance"],
      (data ?? []).map((inv) => {
        const total =
          subtotal(inv.line_items ?? []) * (1 + Number(inv.tax_rate));
        const paid = (inv.payments ?? []).reduce(
          (s: number, p: { amount: number }) => s + Number(p.amount),
          0
        );
        return [
          `INV-${String(inv.number).padStart(4, "0")}`,
          new Date(inv.created_at).toISOString().slice(0, 10),
          inv.title,
          (inv.customers as unknown as { name: string } | null)?.name ?? "",
          (inv.locations as unknown as { label: string } | null)?.label ?? "",
          (inv.profiles as unknown as { full_name: string } | null)?.full_name ??
            "",
          inv.status,
          total.toFixed(2),
          paid.toFixed(2),
          Math.max(0, total - paid).toFixed(2),
        ];
      })
    );
    filename = "sales";
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fieldstack-${filename}-${stamp}.csv"`,
    },
  });
}
