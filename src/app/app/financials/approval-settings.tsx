"use client";

import { useState } from "react";
import { setApprovalThreshold } from "./actions";

export function ApprovalSettings({
  currentThreshold,
}: {
  currentThreshold: number | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await setApprovalThreshold(formData);
    setSaving(false);
    if (result.error) setError(result.error);
    else setSaved(true);
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] p-6 shadow-sm mt-8">
      <h2 className="text-lg font-extrabold text-[#0e1726] mb-1">
        Approval workflow
      </h2>
      <p className="text-sm text-[#5a6b85] mb-4">
        Estimates over this amount can&apos;t be sent by Managers until an
        Admin or Owner approves them. Leave blank to turn approvals off.
      </p>
      <form action={handleSubmit} className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-sm font-semibold text-[#0e1726] mb-1">
            Threshold ($)
          </label>
          <input
            name="threshold"
            type="number"
            step="0.01"
            min="0"
            defaultValue={currentThreshold ?? ""}
            placeholder="e.g. 5000"
            className="w-44 border border-[#e4e9f1] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#ff8a1e]"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2.5 transition disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && (
          <span className="text-sm text-[#1f9d63] font-semibold">Saved ✓</span>
        )}
        {error && <span className="text-sm text-[#d24b4b]">{error}</span>}
      </form>
    </div>
  );
}
