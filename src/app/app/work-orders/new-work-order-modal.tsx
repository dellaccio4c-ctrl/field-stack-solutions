"use client";

import { useState } from "react";
import { createWorkOrder } from "./actions";

type Customer = {
  id: string;
  name: string;
  locations: {
    id: string;
    label: string;
    address: string;
    city: string | null;
    state: string | null;
    zip: string | null;
  }[];
};
type Staff = { id: string; full_name: string; preferred_name: string | null };

export function NewWorkOrderModal({
  customers,
  staff,
}: {
  customers: Customer[];
  staff: Staff[];
}) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = customers.find((c) => c.id === customerId);
  const usingSite = Boolean(locationId);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    const result = await createWorkOrder(formData);
    // redirects on success
    if (result?.error) {
      setSaving(false);
      setError(result.error);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2.5 transition"
      >
        + New Work Order
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[92vh] overflow-y-auto">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-4">
              New Work Order
            </h2>
            <form action={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Title <span className="text-[#d24b4b]">*</span>
                </label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Replace POS terminal — Bay 3"
                  className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Customer
                  </label>
                  <select
                    name="customer_id"
                    value={customerId}
                    onChange={(e) => {
                      setCustomerId(e.target.value);
                      setLocationId("");
                    }}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
                  >
                    <option value="">— none —</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Site
                  </label>
                  <select
                    name="location_id"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    disabled={!selected?.locations?.length}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e] disabled:bg-[#f5f7fb]"
                  >
                    <option value="">— enter address below —</option>
                    {selected?.locations?.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!usingSite && (
                <div className="bg-[#f5f7fb] rounded-xl p-3 space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                      Service address
                    </label>
                    <input
                      name="address"
                      placeholder="Street address"
                      className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      name="city"
                      placeholder="City"
                      className="border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
                    />
                    <input
                      name="state"
                      placeholder="State (SC)"
                      maxLength={2}
                      className="border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e] uppercase"
                    />
                    <input
                      name="zip"
                      placeholder="ZIP"
                      className="border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    defaultValue="normal"
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Assign to
                  </label>
                  <select
                    name="assigned_to"
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
                  >
                    <option value="">— unassigned —</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.preferred_name || s.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Scheduled date
                  </label>
                  <input
                    name="scheduled_date"
                    type="date"
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-[#0e1726] cursor-pointer">
                <input type="checkbox" name="is_pumping" className="w-4 h-4" />
                Pumping division work order
              </label>

              {error && (
                <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
                >
                  {saving ? "Creating…" : "Create work order"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-5 border border-[#e4e9f1] rounded-lg font-semibold text-[#0e1726] hover:border-[#ff8a1e]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
