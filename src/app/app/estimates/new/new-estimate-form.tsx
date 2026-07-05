"use client";

import { useState } from "react";
import { createEstimate } from "../actions";

type Customer = {
  id: string;
  name: string;
  locations: { id: string; label: string }[];
};

export function NewEstimateForm({ customers }: { customers: Customer[] }) {
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = customers.find((c) => c.id === customerId);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    const result = await createEstimate(formData);
    // createEstimate redirects on success; only errors return
    if (result?.error) {
      setSaving(false);
      setError(result.error);
    }
  }

  return (
    <form
      action={handleSubmit}
      className="bg-white rounded-2xl border border-[#e4e9f1] p-6 space-y-4 shadow-sm"
    >
      <div>
        <label className="block text-sm font-semibold text-[#0e1726] mb-1">
          Customer <span className="text-[#d24b4b]">*</span>
        </label>
        <select
          name="customer_id"
          required
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-[#ff8a1e]"
        >
          <option value="">Select a customer…</option>
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
          disabled={!selected?.locations?.length}
          className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-[#ff8a1e] disabled:bg-[#f5f7fb]"
        >
          <option value="">
            {selected?.locations?.length
              ? "Select a site (optional)…"
              : "No sites for this customer"}
          </option>
          {selected?.locations?.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#0e1726] mb-1">
          Title <span className="text-[#d24b4b]">*</span>
        </label>
        <input
          name="title"
          required
          placeholder="e.g. Panel upgrade — Building A"
          className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#ff8a1e]"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#0e1726] mb-1">
          Tax rate (%)
        </label>
        <input
          name="tax_rate"
          type="number"
          step="0.001"
          min="0"
          defaultValue="0"
          className="w-40 border border-[#e4e9f1] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#ff8a1e]"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold text-[#0e1726] cursor-pointer">
        <input type="checkbox" name="is_pumping" className="w-4 h-4" />
        Pumping division job
        <span className="font-normal text-[#5a6b85]">
          (visible to the Xpress Pumping team)
        </span>
      </label>

      <div>
        <label className="block text-sm font-semibold text-[#0e1726] mb-1">
          Notes
        </label>
        <textarea
          name="notes"
          rows={3}
          className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#ff8a1e]"
        />
      </div>

      {error && (
        <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-6 py-3 transition disabled:opacity-60"
      >
        {saving ? "Creating…" : "Create estimate & add line items"}
      </button>
    </form>
  );
}
