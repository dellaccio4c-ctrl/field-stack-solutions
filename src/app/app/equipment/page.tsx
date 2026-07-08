import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EquipmentManager } from "./equipment-manager";
import { ImportEquipmentModal } from "./import-equipment-modal";

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; location?: string; q?: string }>;
}) {
  const { customer, location, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("equipment")
    .select(
      "*, customers(name), locations(label), work_orders(id)"
    )
    .order("name");
  if (customer) query = query.eq("customer_id", customer);
  if (location) query = query.eq("location_id", location);
  if (q)
    query = query.or(
      `name.ilike.%${q}%,serial_number.ilike.%${q}%,unit_number.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%`
    );

  const [{ data: equipment }, { data: customers }] = await Promise.all([
    query,
    supabase
      .from("customers")
      .select("id, name, locations(id, label)")
      .order("name"),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
          Equipment
        </h1>
        <ImportEquipmentModal />
      </div>
      <p className="text-[#5a6b85] mb-6">
        Every tracked unit with its lifetime service history. Search by name,
        serial, unit #, brand, or model.
      </p>

      <form method="get" className="flex gap-2 mb-5 flex-wrap">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search serial, unit #, brand…"
          className="border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#ff8a1e] w-full sm:w-64"
        />
        <select
          name="customer"
          defaultValue={customer ?? ""}
          className="border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#ff8a1e]"
        >
          <option value="">All customers</option>
          {(customers ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {customer && (
          <select
            name="location"
            defaultValue={location ?? ""}
            className="border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#ff8a1e]"
          >
            <option value="">All sites</option>
            {(customers ?? [])
              .find((c) => c.id === customer)
              ?.locations?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
          </select>
        )}
        <button
          type="submit"
          className="bg-[#0e1f38] hover:bg-[#15294a] text-white font-semibold rounded-lg px-4 py-2 text-sm transition"
        >
          Filter
        </button>
        {(q || customer || location) && (
          <Link
            href="/app/equipment"
            className="text-sm text-[#5a6b85] self-center hover:text-[#b9700f]"
          >
            Clear
          </Link>
        )}
      </form>

      <EquipmentManager
        equipment={(equipment ?? []).map((e) => ({
          ...e,
          customerName:
            (e.customers as unknown as { name: string } | null)?.name ?? null,
          locationLabel:
            (e.locations as unknown as { label: string } | null)?.label ?? null,
          workOrderCount: (e.work_orders as unknown as { id: string }[])?.length ?? 0,
        }))}
        customers={customers ?? []}
      />
    </div>
  );
}
