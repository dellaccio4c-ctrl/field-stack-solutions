"use client";

import { useState } from "react";
import Link from "next/link";
import { createEquipment, updateEquipment } from "./actions";

export type EquipmentRow = {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  unit_number: string | null;
  install_date: string | null;
  warranty_expires: string | null;
  pm_interval_months: number | null;
  pm_window_days: number;
  status: string;
  notes: string | null;
  customer_id: string | null;
  location_id: string | null;
  customerName: string | null;
  locationLabel: string | null;
  workOrderCount: number;
};

type Customer = {
  id: string;
  name: string;
  locations: { id: string; label: string }[];
};

const CATEGORIES = [
  "Pump",
  "POS / Payment",
  "Compressor",
  "HVAC",
  "Camera / Security",
  "Network",
  "Electrical",
  "Vacuum",
  "Dryer / Blower",
  "Other",
];

export function EquipmentManager({
  equipment,
  customers,
}: {
  equipment: EquipmentRow[];
  customers: Customer[];
}) {
  const [editing, setEditing] = useState<EquipmentRow | "new" | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const current = editing !== "new" && editing ? editing : null;
  const selectedCustomer = customers.find(
    (c) => c.id === (customerId || current?.customer_id)
  );

  function openEditor(item: EquipmentRow | "new") {
    setError(null);
    setCustomerId(item === "new" ? "" : (item.customer_id ?? ""));
    setEditing(item);
  }

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    const result =
      editing === "new"
        ? await createEquipment(formData)
        : await updateEquipment((editing as EquipmentRow).id, formData);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(null);
  }

  const warrantySoon = (d: string | null) => {
    if (!d) return false;
    const days =
      (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days < 60;
  };
  const warrantyExpired = (d: string | null) =>
    Boolean(d && new Date(d).getTime() < Date.now());

  return (
    <>
      <div className="mb-4">
        <button
          onClick={() => openEditor("new")}
          className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2.5 transition"
        >
          + Add Equipment
        </button>
      </div>

      {!equipment.length ? (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-10 text-center text-[#5a6b85]">
          No equipment tracked yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1]">
                <th className="px-5 py-3.5 font-semibold">Unit</th>
                <th className="px-5 py-3.5 font-semibold">Site</th>
                <th className="px-5 py-3.5 font-semibold">Brand / Model</th>
                <th className="px-5 py-3.5 font-semibold">Serial</th>
                <th className="px-5 py-3.5 font-semibold">Unit #</th>
                <th className="px-5 py-3.5 font-semibold">Warranty</th>
                <th className="px-5 py-3.5 font-semibold text-right">History</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {equipment.map((e) => (
                <tr
                  key={e.id}
                  className={`border-b border-[#e4e9f1] last:border-0 hover:bg-[#f5f7fb] ${
                    e.status === "retired" ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/app/equipment/${e.id}`}
                      className="font-semibold text-[#0e1726] hover:text-[#b9700f]"
                    >
                      {e.name}
                    </Link>
                    {e.category && (
                      <div className="text-xs text-[#5a6b85]">{e.category}</div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[#5a6b85]">
                    {e.customerName ?? "—"}
                    {e.locationLabel && (
                      <div className="text-xs">{e.locationLabel}</div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[#5a6b85]">
                    {[e.brand, e.model].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    {e.serial_number ? (
                      <code className="bg-[#f5f7fb] border border-[#e4e9f1] rounded px-2 py-0.5 text-xs font-bold">
                        {e.serial_number}
                      </code>
                    ) : (
                      <span className="text-[#5a6b85]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[#5a6b85]">
                    {e.unit_number ?? "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    {e.warranty_expires ? (
                      <span
                        className={`text-xs font-bold ${
                          warrantyExpired(e.warranty_expires)
                            ? "text-[#d24b4b]"
                            : warrantySoon(e.warranty_expires)
                              ? "text-[#b9700f]"
                              : "text-[#1f9d63]"
                        }`}
                      >
                        {e.warranty_expires}
                        {warrantyExpired(e.warranty_expires) && " (expired)"}
                      </span>
                    ) : (
                      <span className="text-[#5a6b85]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold">
                    {e.workOrderCount} WO{e.workOrderCount === 1 ? "" : "s"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => openEditor(e)}
                      className="text-[#2f6fd6] font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[92vh] overflow-y-auto">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-4">
              {editing === "new" ? "Add Equipment" : `Edit — ${current?.name}`}
            </h2>
            <form action={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field
                  name="name"
                  label="Name / description"
                  required
                  defaultValue={current?.name}
                  placeholder="Vacuum pump — Bay 2"
                />
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    defaultValue={current?.category ?? ""}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
                  >
                    <option value="">—</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field name="brand" label="Brand" defaultValue={current?.brand ?? ""} />
                <Field name="model" label="Model" defaultValue={current?.model ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  name="serial_number"
                  label="Serial number"
                  defaultValue={current?.serial_number ?? ""}
                />
                <Field
                  name="unit_number"
                  label="Unit #"
                  defaultValue={current?.unit_number ?? ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    PM interval (months)
                  </label>
                  <input
                    name="pm_interval_months"
                    type="number"
                    min="1"
                    max="60"
                    defaultValue={current?.pm_interval_months ?? ""}
                    placeholder="blank = no auto-PM"
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    PM window (± days)
                  </label>
                  <input
                    name="pm_window_days"
                    type="number"
                    min="0"
                    max="90"
                    defaultValue={current?.pm_window_days ?? 14}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Install date
                  </label>
                  <input
                    name="install_date"
                    type="date"
                    defaultValue={current?.install_date ?? ""}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Warranty expires
                  </label>
                  <input
                    name="warranty_expires"
                    type="date"
                    defaultValue={current?.warranty_expires ?? ""}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Customer
                  </label>
                  <select
                    name="customer_id"
                    value={customerId || current?.customer_id || ""}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
                  >
                    <option value="">—</option>
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
                    defaultValue={current?.location_id ?? ""}
                    disabled={!selectedCustomer?.locations?.length}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e] disabled:bg-[#f5f7fb]"
                  >
                    <option value="">—</option>
                    {selectedCustomer?.locations?.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={current?.notes ?? ""}
                  className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                />
              </div>
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
                  {saving ? "Saving…" : "Save equipment"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
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

function Field({
  name,
  label,
  required = false,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#0e1726] mb-1">
        {label}
        {required && <span className="text-[#d24b4b]"> *</span>}
      </label>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
      />
    </div>
  );
}
