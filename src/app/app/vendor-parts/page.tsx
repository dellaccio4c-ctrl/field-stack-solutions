import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/money";
import { PartsManager } from "./parts-manager";
import { MarkupSettings } from "./markup-settings";

const PAGE_SIZE = 50;

export default async function VendorPartsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; vendor?: string; category?: string; page?: string }>;
}) {
  const { q, vendor, category, page } = await searchParams;
  const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  const isOwner = me?.role === "owner";

  const { data: settings } = await supabase
    .from("company_settings")
    .select("parts_markup_percent")
    .single();
  const markup = Number(settings?.parts_markup_percent ?? 35);

  let query = supabase
    .from("vendor_parts")
    .select("id, vendor, sku, name, description, category, brand, unit, cost, url, last_checked", {
      count: "exact",
    })
    .eq("is_active", true)
    .order("name")
    .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1);
  if (vendor) query = query.eq("vendor", vendor);
  if (category) query = query.eq("category", category);
  if (q)
    query = query.or(
      `name.ilike.%${q}%,sku.ilike.%${q}%,brand.ilike.%${q}%,description.ilike.%${q}%`
    );

  const [{ data: parts, count }, { data: vendorRows }, { data: categoryRows }] =
    await Promise.all([
      query,
      supabase.from("vendor_parts").select("vendor").limit(5000),
      supabase.from("vendor_parts").select("category").not("category", "is", null).limit(5000),
    ]);

  const vendors = [...new Set((vendorRows ?? []).map((v) => v.vendor))].sort();
  const categories = [...new Set((categoryRows ?? []).map((c) => c.category as string))].sort();
  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) =>
    `/app/vendor-parts?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(vendor ? { vendor } : {}),
      ...(category ? { category } : {}),
      page: String(p),
    })}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
          Vendor Parts &amp; Pricing
        </h1>
        <a
          href={`/app/vendor-parts/export?${new URLSearchParams({
            ...(q ? { q } : {}),
            ...(vendor ? { vendor } : {}),
            ...(category ? { category } : {}),
          })}`}
          className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] text-[#0e1726] font-semibold rounded-lg px-4 py-2 text-sm transition"
        >
          Export CSV
        </a>
      </div>
      <p className="text-[#5a6b85] mb-5">
        {total.toLocaleString()} parts across {vendors.length} vendor
        {vendors.length === 1 ? "" : "s"}. Costs are internal — estimates use
        cost plus the {markup}% markup (sell price shown).
      </p>

      {isOwner && <MarkupSettings current={markup} />}

      <form method="get" className="flex flex-wrap items-end gap-3 mb-5 bg-white rounded-2xl border border-[#e4e9f1] p-4">
        <label className="text-xs font-semibold text-[#5a6b85] grow max-w-md">
          Search
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Part number, name, brand, description…"
            className="block mt-1 w-full border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]"
          />
        </label>
        <label className="text-xs font-semibold text-[#5a6b85]">
          Vendor
          <select name="vendor" defaultValue={vendor ?? ""} className="block mt-1 border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] min-w-36">
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#5a6b85]">
          Category
          <select name="category" defaultValue={category ?? ""} className="block mt-1 border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] min-w-44">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="bg-[#0e1f38] hover:bg-[#15294a] text-white font-semibold rounded-lg px-4 py-2 text-sm transition">
          Filter
        </button>
        {(q || vendor || category) && (
          <Link href="/app/vendor-parts" className="text-sm text-[#5a6b85] hover:text-[#b9700f] pb-2">
            Clear
          </Link>
        )}
      </form>

      <PartsManager
        parts={(parts ?? []).map((p) => ({
          ...p,
          cost: p.cost == null ? null : Number(p.cost),
          sell: p.cost == null ? null : money(Number(p.cost) * (1 + markup / 100)),
        }))}
        markup={markup}
      />

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5 text-sm">
          {pageNum > 1 && (
            <Link href={qs(pageNum - 1)} className="font-semibold text-[#b9700f] hover:underline">← Prev</Link>
          )}
          <span className="text-[#5a6b85]">
            Page {pageNum} of {pageCount.toLocaleString()}
          </span>
          {pageNum < pageCount && (
            <Link href={qs(pageNum + 1)} className="font-semibold text-[#b9700f] hover:underline">Next →</Link>
          )}
        </div>
      )}
    </div>
  );
}
