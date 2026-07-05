"use client";

import { useRef, useState } from "react";
import { addExpense } from "./actions";

type Customer = {
  id: string;
  name: string;
  locations: { id: string; label: string }[];
};

export function AddExpenseForm({ customers }: { customers: Customer[] }) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const selected = customers.find((c) => c.id === customerId);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    const result = await addExpense(formData);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    formRef.current?.reset();
    setCustomerId("");
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2.5 transition"
      >
        + Record Expense
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-4">
              Record Expense
            </h2>
            <form ref={formRef} action={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Description <span className="text-[#d24b4b]">*</span>
                </label>
                <input
                  name="description"
                  required
                  className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Amount <span className="text-[#d24b4b]">*</span>
                  </label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Date
                  </label>
                  <input
                    name="incurred_at"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Category
                  </label>
                  <input
                    name="category"
                    placeholder="Materials…"
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Vendor
                </label>
                <input
                  name="vendor"
                  className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Customer (optional)
                  </label>
                  <select
                    name="customer_id"
                    value={customerId}
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
                    Site (optional)
                  </label>
                  <select
                    name="location_id"
                    disabled={!selected?.locations?.length}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e] disabled:bg-[#f5f7fb]"
                  >
                    <option value="">—</option>
                    {selected?.locations?.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#0e1726] cursor-pointer">
                <input type="checkbox" name="is_pumping" className="w-4 h-4" />
                Pumping division expense
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
                  {saving ? "Saving…" : "Save expense"}
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
