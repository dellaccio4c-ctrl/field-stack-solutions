import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InventoryManager } from "./inventory-manager";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; low?: string }>;
}) {
  const { category, q, low } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("inventory_items")
    .select("*, holder:profiles!inventory_items_assigned_to_fkey(full_name, preferred_name)")
    .order("name");
  if (category) query = query.eq("category", category);
  if (q)
    query = query.or(
      `name.ilike.%${q}%,sku.ilike.%${q}%,serial_number.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%,storage_location.ilike.%${q}%`
    );

  const [{ data: items }, { data: staff }] = await Promise.all([
    query,
    supabase
      .from("profiles")
      .select("id, full_name, preferred_name")
      .neq("role", "customer")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  const filtered = (items ?? []).filter(
    (i) => !low || i.quantity <= i.min_quantity
  );
  const lowCount = (items ?? []).filter(
    (i) => i.is_active && i.min_quantity > 0 && i.quantity <= i.min_quantity
  ).length;

  const categories = [
    ["", "All"],
    ["tool", "Tools"],
    ["part", "Parts"],
    ["computer", "Computers"],
    ["consumable", "Consumables"],
    ["other", "Other"],
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
          Inventory
          {lowCount > 0 && (
            <Link
              href="/app/inventory?low=1"
              className="ml-3 align-middle text-sm bg-[#d24b4b] text-white font-bold rounded-full px-3 py-1"
            >
              {lowCount} low stock
            </Link>
          )}
        </h1>
      </div>
      <p className="text-[#5a6b85] mb-5">
        Tools, parts, computers, and consumables — with stock levels, check-outs,
        and a full movement history.
      </p>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {categories.map(([value, label]) => (
          <Link
            key={value}
            href={value ? `/app/inventory?category=${value}` : "/app/inventory"}
            className={`text-sm font-semibold rounded-lg px-3 py-1.5 border transition ${
              (category ?? "") === value && !low
                ? "bg-[#0e1f38] text-white border-[#0e1f38]"
                : "bg-white text-[#0e1726] border-[#e4e9f1] hover:border-[#ff8a1e]"
            }`}
          >
            {label}
          </Link>
        ))}
        <form method="get" className="flex gap-2 ml-auto">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, SKU, serial…"
            className="border border-[#e4e9f1] rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-[#ff8a1e] w-56"
          />
          <button
            type="submit"
            className="bg-[#0e1f38] hover:bg-[#15294a] text-white font-semibold rounded-lg px-4 py-1.5 text-sm transition"
          >
            Search
          </button>
        </form>
      </div>

      <InventoryManager items={filtered} staff={staff ?? []} />
    </div>
  );
}
