import { createClient } from "@/lib/supabase/server";

function cell(v: unknown) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const vendor = url.searchParams.get("vendor");
  const category = url.searchParams.get("category");
  const supabase = await createClient();

  const lines = ["Vendor,SKU,Name,Description,Category,Brand,Unit,Cost,URL,Last Checked"];
  // Page through in chunks — the full Grainger set is >50k rows.
  for (let from = 0; from < 100000; from += 1000) {
    let query = supabase
      .from("vendor_parts")
      .select("vendor, sku, name, description, category, brand, unit, cost, url, last_checked")
      .eq("is_active", true)
      .order("name")
      .range(from, from + 999);
    if (vendor) query = query.eq("vendor", vendor);
    if (category) query = query.eq("category", category);
    if (q)
      query = query.or(
        `name.ilike.%${q}%,sku.ilike.%${q}%,brand.ilike.%${q}%,description.ilike.%${q}%`
      );
    const { data, error } = await query;
    if (error) return new Response(error.message, { status: 500 });
    if (!data?.length) break;
    for (const p of data) {
      lines.push(
        [p.vendor, p.sku, p.name, p.description, p.category, p.brand, p.unit, p.cost, p.url, p.last_checked]
          .map(cell)
          .join(",")
      );
    }
    if (data.length < 1000) break;
  }

  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="vendor-parts.csv"',
    },
  });
}
