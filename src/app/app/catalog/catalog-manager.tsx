"use client";

import { useRef, useState } from "react";
import {
  createCatalogItem,
  updateCatalogItem,
  toggleCatalogItem,
} from "./actions";

type Item = {
  id: string;
  name: string;
  description: string | null;
  unit_price: number;
  is_active: boolean;
  priceLabel: string;
};

export function CatalogManager({ items }: { items: Item[] }) {
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    const result =
      editing === "new"
        ? await createCatalogItem(formData)
        : await updateCatalogItem((editing as Item).id, formData);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(null);
  }

  const current = editing !== "new" && editing ? editing : null;

  return (
    <>
      <div className="mb-4">
        <button
          onClick={() => setEditing("new")}
          className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2.5 transition"
        >
          + New Service
        </button>
      </div>

      {!items.length ? (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-10 text-center text-[#5a6b85]">
          No saved services yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1]">
                <th className="px-5 py-3.5 font-semibold">Service</th>
                <th className="px-5 py-3.5 font-semibold">Description</th>
                <th className="px-5 py-3.5 font-semibold text-right">Price</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="w-32" />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr
                  key={it.id}
                  className={`border-b border-[#e4e9f1] last:border-0 ${
                    !it.is_active ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-5 py-3.5 font-semibold">{it.name}</td>
                  <td className="px-5 py-3.5 text-[#5a6b85]">
                    {it.description ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold">
                    {it.priceLabel}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                        it.is_active
                          ? "bg-[#e3f6ec] text-[#1f9d63]"
                          : "bg-[#eef1f6] text-[#5a6b85]"
                      }`}
                    >
                      {it.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => setEditing(it)}
                      className="text-[#2f6fd6] font-semibold hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleCatalogItem(it.id, !it.is_active)}
                      className="text-[#5a6b85] font-semibold hover:underline"
                    >
                      {it.is_active ? "Deactivate" : "Activate"}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-4">
              {editing === "new" ? "New Service" : "Edit Service"}
            </h2>
            <form ref={formRef} action={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Name <span className="text-[#d24b4b]">*</span>
                </label>
                <input
                  name="name"
                  required
                  defaultValue={current?.name}
                  className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Description
                </label>
                <input
                  name="description"
                  defaultValue={current?.description ?? ""}
                  className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Unit price <span className="text-[#d24b4b]">*</span>
                </label>
                <input
                  name="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={current ? Number(current.unit_price) : undefined}
                  className="w-40 border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
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
                  {saving ? "Saving…" : "Save"}
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
