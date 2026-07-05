"use client";

import { useMemo, useState } from "react";

type Customer = {
  id: string;
  name: string;
  locations: { id: string; label: string }[];
};
type Staff = { id: string; full_name: string; email: string };

export function ExportPanel({
  customers,
  staff,
}: {
  customers: Customer[];
  staff: Staff[];
}) {
  const [type, setType] = useState<"sales" | "expenses">("sales");
  const [customerIds, setCustomerIds] = useState<string[]>([]);
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const availableLocations = useMemo(
    () =>
      customers
        .filter((c) => !customerIds.length || customerIds.includes(c.id))
        .flatMap((c) =>
          c.locations.map((l) => ({ ...l, customer: c.name }))
        ),
    [customers, customerIds]
  );

  const href = useMemo(() => {
    const p = new URLSearchParams({ type });
    if (customerIds.length) p.set("customer_ids", customerIds.join(","));
    if (locationIds.length) p.set("location_ids", locationIds.join(","));
    if (userId) p.set("user_id", userId);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return `/app/financials/export?${p.toString()}`;
  }, [type, customerIds, locationIds, userId, from, to]);

  function toggle(list: string[], set: (v: string[]) => void, id: string) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] p-6 shadow-sm">
      <h2 className="text-lg font-extrabold text-[#0e1726] mb-1">
        Export reports
      </h2>
      <p className="text-sm text-[#5a6b85] mb-4">
        Filter by customer, site (select multiple), team member, and date range
        — then download as CSV for Excel.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#0e1726] mb-1">
              Report type
            </label>
            <div className="flex gap-2">
              {(["sales", "expenses"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm capitalize border transition ${
                    type === t
                      ? "bg-[#0e1f38] text-white border-[#0e1f38]"
                      : "bg-white text-[#0e1726] border-[#e4e9f1] hover:border-[#ff8a1e]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                From
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                To
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0e1726] mb-1">
              Team member
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
            >
              <option value="">All team members</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#0e1726] mb-1">
              Customers{" "}
              <span className="font-normal text-[#5a6b85]">
                (none selected = all)
              </span>
            </label>
            <div className="border border-[#e4e9f1] rounded-lg max-h-32 overflow-y-auto p-2 space-y-1">
              {customers.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-[#f5f7fb] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={customerIds.includes(c.id)}
                    onChange={() => toggle(customerIds, setCustomerIds, c.id)}
                  />
                  {c.name}
                </label>
              ))}
              {!customers.length && (
                <div className="text-sm text-[#5a6b85] px-2 py-1">
                  No customers yet.
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0e1726] mb-1">
              Sites{" "}
              <span className="font-normal text-[#5a6b85]">
                (none selected = all)
              </span>
            </label>
            <div className="border border-[#e4e9f1] rounded-lg max-h-32 overflow-y-auto p-2 space-y-1">
              {availableLocations.map((l) => (
                <label
                  key={l.id}
                  className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-[#f5f7fb] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={locationIds.includes(l.id)}
                    onChange={() => toggle(locationIds, setLocationIds, l.id)}
                  />
                  {l.label}{" "}
                  <span className="text-[#5a6b85]">({l.customer})</span>
                </label>
              ))}
              {!availableLocations.length && (
                <div className="text-sm text-[#5a6b85] px-2 py-1">
                  No sites for the selected customers.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <a
        href={href}
        className="inline-block mt-5 bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-6 py-3 transition"
      >
        Download CSV ⬇
      </a>
    </div>
  );
}
