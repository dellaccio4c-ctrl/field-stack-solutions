import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SitesMapLoader } from "./sites-map-loader";
import { LocateSitePinsButton } from "./locate-site-pins-button";

const OPEN_WO = ["open", "scheduled", "in_progress", "on_hold"];

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("locations")
    .select(
      "id, label, address, city, state, zip, notes, lat, lng, customer_id, customers(name), equipment(id), work_orders(id, status)"
    )
    .order("label");
  if (q)
    query = query.or(
      `label.ilike.%${q}%,address.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%,zip.ilike.%${q}%`
    );

  const { data: sites } = await query;

  const rows = (sites ?? []).map((s) => ({
    id: s.id,
    label: s.label,
    address: [s.address, s.city, s.state, s.zip].filter(Boolean).join(", "),
    notes: s.notes,
    lat: s.lat,
    lng: s.lng,
    customerId: s.customer_id,
    customerName:
      (s.customers as unknown as { name: string } | null)?.name ?? "—",
    equipmentCount: (s.equipment as unknown as { id: string }[])?.length ?? 0,
    openWOs:
      (s.work_orders as unknown as { status: string }[])?.filter((w) =>
        OPEN_WO.includes(w.status)
      ).length ?? 0,
  }));

  const missingPins = rows.filter((r) => r.lat == null).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
          Sites
        </h1>
        <LocateSitePinsButton missingCount={missingPins} />
      </div>
      <p className="text-[#5a6b85] mb-5">
        Every service location across all customers. Pins:{" "}
        <span className="text-[#d24b4b] font-semibold">red has open work</span>{" "}
        · <span className="text-[#1f9d63] font-semibold">green all clear</span>.
      </p>

      <form method="get" className="flex gap-2 mb-5">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search site, address, city, state…"
          className="border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#ff8a1e] w-72"
        />
        <button
          type="submit"
          className="bg-[#0e1f38] hover:bg-[#15294a] text-white font-semibold rounded-lg px-4 py-2 text-sm transition"
        >
          Search
        </button>
        {q && (
          <Link
            href="/app/sites"
            className="text-sm text-[#5a6b85] self-center hover:text-[#b9700f]"
          >
            Clear
          </Link>
        )}
      </form>

      <SitesMapLoader sites={rows} />

      {!rows.length ? (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-10 text-center text-[#5a6b85]">
          No sites yet — add them from a customer&apos;s page.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1]">
                <th className="px-5 py-3.5 font-semibold">Site</th>
                <th className="px-5 py-3.5 font-semibold">Customer</th>
                <th className="px-5 py-3.5 font-semibold">Address</th>
                <th className="px-5 py-3.5 font-semibold text-right">Equipment</th>
                <th className="px-5 py-3.5 font-semibold text-right">Open work</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-[#e4e9f1] last:border-0 hover:bg-[#f5f7fb]"
                >
                  <td className="px-5 py-3.5 font-semibold">{s.label}</td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/app/customers/${s.customerId}`}
                      className="text-[#0e1726] hover:text-[#b9700f]"
                    >
                      {s.customerName}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-[#5a6b85]">{s.address}</td>
                  <td className="px-5 py-3.5 text-right">
                    {s.equipmentCount > 0 ? (
                      <Link
                        href={`/app/equipment?customer=${s.customerId}&location=${s.id}`}
                        className="font-semibold text-[#2f6fd6] hover:underline"
                      >
                        {s.equipmentCount}
                      </Link>
                    ) : (
                      <span className="text-[#5a6b85]">0</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {s.openWOs > 0 ? (
                      <span className="font-bold text-[#d24b4b]">{s.openWOs}</span>
                    ) : (
                      <span className="text-[#1f9d63] font-semibold">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
