"use client";

import { useState } from "react";
import { saveNotifyPrefs } from "./notify-actions";

export const NOTIFY_OPTIONS: { key: string; label: string; hint: string }[] = [
  { key: "wo_assigned", label: "Work order assigned to me", hint: "Email when a work order is assigned to you." },
  { key: "site_closures", label: "Site closure reports", hint: "Email when any site submits a closure report." },
  { key: "incident_claims", label: "Customer incident claims", hint: "Email when a customer incident claim is filed." },
  { key: "estimate_approvals", label: "Estimates awaiting approval", hint: "Email when an estimate needs Admin/Owner approval." },
  { key: "payment_received", label: "Payments received", hint: "Email when an invoice is paid online." },
];

export function NotificationSettings({ prefs }: { prefs: Record<string, boolean> }) {
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFY_OPTIONS.map((o) => [o.key, prefs[o.key] ?? false]))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await saveNotifyPrefs(state);
    setSaving(false);
    setMsg(res.error ?? "Saved.");
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] p-6 shadow-sm mb-6">
      <h2 className="text-lg font-extrabold text-[#0e1726] mb-1">Notifications</h2>
      <p className="text-sm text-[#5a6b85] mb-4">
        Email alerts sent to your work email. Sent only when email sending is
        configured for the company.
      </p>
      <div className="space-y-3">
        {NOTIFY_OPTIONS.map((o) => (
          <label key={o.key} className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={state[o.key]}
              onChange={(e) => setState({ ...state, [o.key]: e.target.checked })}
              className="w-4 h-4 mt-0.5 accent-[#ff8a1e]"
            />
            <span>
              <span className="block text-sm font-semibold text-[#0e1726]">{o.label}</span>
              <span className="block text-xs text-[#5a6b85]">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={save}
          disabled={saving}
          className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2 text-sm transition disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save notification settings"}
        </button>
        {msg && (
          <span className={`text-xs ${msg === "Saved." ? "text-[#1f9d63]" : "text-[#d24b4b]"}`}>
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
