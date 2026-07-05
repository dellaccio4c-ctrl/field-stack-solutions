"use client";

import { useState } from "react";
import {
  createInventoryItem,
  updateInventoryItem,
  adjustStock,
  toggleInventoryItem,
} from "./actions";

type Item = {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  quantity: number;
  min_quantity: number;
  unit_cost: number | null;
  storage_location: string | null;
  assigned_to: string | null;
  notes: string | null;
  is_active: boolean;
  holder: { full_name: string; preferred_name: string | null } | null;
};

type Staff = { id: string; full_name: string; preferred_name: string | null };

const CATEGORY_LABEL: Record<string, string> = {
  tool: "Tool",
  part: "Part",
  computer: "Computer",
  consumable: "Consumable",
  other: "Other",
};

type OpenWO = { id: string; number: number; title: string };

export function InventoryManager({
  items,
  staff,
  openWorkOrders = [],
}: {
  items: Item[];
  staff: Staff[];
  openWorkOrders?: OpenWO[];
}) {
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [adjusting, setAdjusting] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const current = editing !== "new" && editing ? editing : null;

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    const result =
      editing === "new"
        ? await createInventoryItem(formData)
        : await updateInventoryItem((editing as Item).id, formData);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(null);
  }

  async function handleAdjust(formData: FormData) {
    if (!adjusting) return;
    setSaving(true);
    setError(null);
    const direction = String(formData.get("direction"));
    const qty = Math.abs(parseInt(String(formData.get("qty") || "0"), 10) || 0);
    const result = await adjustStock(
      adjusting.id,
      direction === "out" ? -qty : qty,
      String(formData.get("reason") ?? ""),
      String(formData.get("work_order_id") ?? "") || null
    );
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setAdjusting(null);
  }

  return (
    <>
      <div className="mb-4">
        <button
          onClick={() => {
            setError(null);
            setEditing("new");
          }}
          className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2.5 transition"
        >
          + Add Item
        </button>
      </div>

      {!items.length ? (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-10 text-center text-[#5a6b85]">
          No items in this view.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1]">
                <th className="px-5 py-3.5 font-semibold">Item</th>
                <th className="px-5 py-3.5 font-semibold">SKU / Serial</th>
                <th className="px-5 py-3.5 font-semibold">Where</th>
                <th className="px-5 py-3.5 font-semibold">Checked out to</th>
                <th className="px-5 py-3.5 font-semibold text-right">Stock</th>
                <th className="w-40" />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const lowStock =
                  it.min_quantity > 0 && it.quantity <= it.min_quantity;
                return (
                  <tr
                    key={it.id}
                    className={`border-b border-[#e4e9f1] last:border-0 hover:bg-[#f5f7fb] ${
                      !it.is_active ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-semibold">{it.name}</span>
                      <div className="text-xs text-[#5a6b85]">
                        {CATEGORY_LABEL[it.category] ?? it.category}
                        {it.brand && ` · ${it.brand}`}
                        {it.model && ` ${it.model}`}
                        {it.unit_cost != null &&
                          ` · $${Number(it.unit_cost).toFixed(2)}`}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {it.sku || it.serial_number ? (
                        <code className="bg-[#f5f7fb] border border-[#e4e9f1] rounded px-2 py-0.5 text-xs font-bold">
                          {it.sku ?? it.serial_number}
                        </code>
                      ) : (
                        <span className="text-[#5a6b85]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[#5a6b85]">
                      {it.storage_location ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[#5a6b85]">
                      {it.holder
                        ? it.holder.preferred_name || it.holder.full_name
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={`font-bold ${
                          lowStock ? "text-[#d24b4b]" : "text-[#0e1726]"
                        }`}
                      >
                        {it.quantity}
                      </span>
                      {it.min_quantity > 0 && (
                        <span className="text-xs text-[#5a6b85]">
                          {" "}
                          / min {it.min_quantity}
                        </span>
                      )}
                      {lowStock && (
                        <div className="text-[10px] font-bold text-[#d24b4b]">
                          LOW STOCK
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-3">
                      <button
                        onClick={() => {
                          setError(null);
                          setAdjusting(it);
                        }}
                        className="text-[#1f9d63] font-semibold hover:underline"
                      >
                        ± Stock
                      </button>
                      <button
                        onClick={() => {
                          setError(null);
                          setEditing(it);
                        }}
                        className="text-[#2f6fd6] font-semibold hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleInventoryItem(it.id, !it.is_active)}
                        className="text-[#5a6b85] font-semibold hover:underline"
                      >
                        {it.is_active ? "Archive" : "Restore"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {adjusting && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-1">
              Adjust stock — {adjusting.name}
            </h2>
            <p className="text-sm text-[#5a6b85] mb-4">
              Current: <b>{adjusting.quantity}</b>. Every change is logged with
              your name and a timestamp.
            </p>
            <form action={handleAdjust} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Direction
                  </label>
                  <select
                    name="direction"
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
                  >
                    <option value="in">Stock in (+)</option>
                    <option value="out">Stock out (−)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Quantity
                  </label>
                  <input
                    name="qty"
                    type="number"
                    min="1"
                    required
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Reason
                </label>
                <input
                  name="reason"
                  placeholder="e.g. restock order, used on job…"
                  className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                />
              </div>
              {openWorkOrders.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Used on work order{" "}
                    <span className="font-normal text-[#5a6b85]">
                      (optional — feeds job costing)
                    </span>
                  </label>
                  <select
                    name="work_order_id"
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
                  >
                    <option value="">—</option>
                    {openWorkOrders.map((wo) => (
                      <option key={wo.id} value={wo.id}>
                        WO-{String(wo.number).padStart(4, "0")} — {wo.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {error && (
                <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Apply"}
                </button>
                <button
                  type="button"
                  onClick={() => setAdjusting(null)}
                  className="px-5 border border-[#e4e9f1] rounded-lg font-semibold text-[#0e1726] hover:border-[#ff8a1e]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[92vh] overflow-y-auto">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-4">
              {editing === "new" ? "Add Item" : `Edit — ${current?.name}`}
            </h2>
            <form action={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field name="name" label="Name" required defaultValue={current?.name} />
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    defaultValue={current?.category ?? "part"}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
                  >
                    {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field name="sku" label="SKU / part number" defaultValue={current?.sku ?? ""} />
                <Field
                  name="serial_number"
                  label="Serial number"
                  defaultValue={current?.serial_number ?? ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field name="brand" label="Brand" defaultValue={current?.brand ?? ""} />
                <Field name="model" label="Model" defaultValue={current?.model ?? ""} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {editing === "new" && (
                  <div>
                    <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                      Starting qty
                    </label>
                    <input
                      name="quantity"
                      type="number"
                      min="0"
                      defaultValue="0"
                      className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Min stock alert
                  </label>
                  <input
                    name="min_quantity"
                    type="number"
                    min="0"
                    defaultValue={current?.min_quantity ?? 0}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Unit cost ($)
                  </label>
                  <input
                    name="unit_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={current?.unit_cost ?? ""}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  name="storage_location"
                  label="Storage location"
                  defaultValue={current?.storage_location ?? ""}
                  placeholder="Warehouse shelf B3, Truck 1…"
                />
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Checked out to
                  </label>
                  <select
                    name="assigned_to"
                    defaultValue={current?.assigned_to ?? ""}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
                  >
                    <option value="">— nobody —</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.preferred_name || s.full_name}
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
                  {saving ? "Saving…" : "Save item"}
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
