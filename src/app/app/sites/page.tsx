import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  geocodeAddress,
  milesBetween,
  googleMapsDirectionsUrl,
} from "@/lib/geocode";
import { SitesMapLoader } from "./sites-map-loader";
import { LocateSitePinsButton } from "./locate-site-pins-button";
import { ImportSitesModal } from "./import-sites-modal";

const OPEN_WO = ["open", "scheduled", "in_progress", "on_hold"];
const NEARBY_MILES = 30;

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    customer?: string;
    state?: string;
    city?: string;
    zip?: string;
  }>;
}) {
  const { q, customer, state, city, zip } = await searchParams;
  const supabase = await createClient();

  const { data: sites } = await supabase
    .from("locations")
    .select(
      "id, label, address, city, state, zip, notes, lat, lng, customer_id, customers(name), equipment(id), work_orders(id, status)"
    )
    .order("label");

  const all = (sites ?? []).map((s) => ({
    id: s.id,
    label: s.label,
    address: [s.address, s.city, s.state, s.zip].filter(Boolean).join(", "),
    city: s.city,
    state: s.state,
    zip: s.zip,
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

  // Dropdown options come from the full unfiltered set.
  const customers = [
    ...new Map(
      all.filter((s) => s.customerId).map((s) => [s.customerId, s.customerName])
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const states = [...new Set(all.map((s) => s.state).filter(Boolean))].sort() as string[];
  const cities = [...new Set(all.map((s) => s.city).filter(Boolean))].sort() as string[];

  let rows = all;
  if (customer) rows = rows.filter((s) => s.customerId === customer);
  if (state)
    rows = rows.filter((s) => (s.state ?? "").toLowerCase() === state.toLowerCase());
  if (city)
    rows = rows.filter((s) => (s.city ?? "").toLowerCase() === city.toLowerCase());
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter((s) =>
      [s.label, s.address, s.customerName]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }

  // Nearby zip: geocode the zip once and keep pinned sites within ~30 miles;
  // sites without a pin fall back to a same-area zip prefix match.
  let zipNote: string | null = null;
  if (zip?.trim()) {
    const z = zip.trim();
    const center = await geocodeAddress([z]);
    if (center) {
      rows = rows.filter((s) =>
        s.lat != null && s.lng != null
          ? milesBetween(center, { lat: s.lat, lng: s.lng }) <= NEARBY_MILES
          : (s.zip ?? "").slice(0, 3) === z.slice(0, 3)
      );
      zipNote = `Showing sites within ~${NEARBY_MILES} miles of ${z} (sites without a map pin matched by zip area).`;
    } else {
      rows = rows.filter((s) => (s.zip ?? "").slice(0, 3) === z.slice(0, 3));
      zipNote = `Couldn't place zip ${z} on the map — matched by zip area instead.`;
    }
  }

  const filtered = Boolean(customer || state || city || zip || q);
  const missingPins = all.filter((r) => r.lat == null).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
          Sites
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <ImportSitesModal />
          <LocateSitePinsButton missingCount={missingPins} />
        </div>
      </div>
      <p className="text-[#5a6b85] mb-5">
        Every service location across all customers. Pins:{" "}
        <span className="text-[#d24b4b] font-semibold">red has open work</span>{" "}
        · <span className="text-[#1f9d63] font-semibold">green all clear</span>.
      </p>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 mb-5 bg-white rounded-2xl border border-[#e4e9f1] p-4"
      >
        <label className="text-xs font-semibold text-[#5a6b85]">
          Company
          <select
            name="customer"
            defaultValue={customer ?? ""}
            className="block mt-1 border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] focus:outline-none focus:border-[#ff8a1e] min-w-44"
          >
            <option value="">All companies</option>
            {customers.map(([id, name]) => (
              <option key={id} value={id!}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#5a6b85]">
          State
          <select
            name="state"
            defaultValue={state ?? ""}
            className="block mt-1 border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] focus:outline-none focus:border-[#ff8a1e] min-w-28"
          >
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#5a6b85]">
          City
          <select
            name="city"
            defaultValue={city ?? ""}
            className="block mt-1 border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] focus:outline-none focus:border-[#ff8a1e] min-w-36"
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#5a6b85]">
          Near zip
          <input
            name="zip"
            defaultValue={zip ?? ""}
            placeholder="e.g. 35216"
            inputMode="numeric"
            className="block mt-1 border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] focus:outline-none focus:border-[#ff8a1e] w-28"
          />
        </label>
        <label className="text-xs font-semibold text-[#5a6b85] grow max-w-72">
          Search
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Site, address, company…"
            className="block mt-1 w-full border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]"
          />
        </label>
        <button
          type="submit"
          className="bg-[#0e1f38] hover:bg-[#15294a] text-white font-semibold rounded-lg px-4 py-2 text-sm transition"
        >
          Filter
        </button>
        {filtered && (
          <Link
            href="/app/sites"
            className="text-sm text-[#5a6b85] hover:text-[#b9700f] pb-2"
          >
            Clear all
          </Link>
        )}
      </form>

      {zipNote && <p className="text-xs text-[#5a6b85] -mt-2 mb-4">{zipNote}</p>}
      {filtered && (
        <p className="text-sm text-[#5a6b85] mb-3">
          <span className="font-semibold text-[#0e1726]">{rows.length}</span> of{" "}
          {all.length} sites match.
        </p>
      )}

      <SitesMapLoader sites={rows} />

      {!rows.length ? (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-10 text-center text-[#5a6b85]">
          {filtered
            ? "No sites match these filters."
            : "No sites yet — add them from a customer's page."}
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
                <th className="px-5 py-3.5 font-semibold text-right">Navigate</th>
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
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    {s.address ? (
                      <a
                        href={googleMapsDirectionsUrl(s.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#2f6fd6] hover:underline"
                      >
                        Directions
                      </a>
                    ) : (
                      <span className="text-[#5a6b85]">—</span>
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
