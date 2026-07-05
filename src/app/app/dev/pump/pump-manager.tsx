"use client";

import { useState } from "react";
import {
  createPumpSite,
  updatePumpSite,
  markPumped,
  togglePumpSite,
} from "./actions";
import { projectNext, fmtDate, type PumpSite } from "@/lib/pump";

export function PumpManager({ sites }: { sites: PumpSite[] }) {
  const [editing, setEditing] = useState<PumpSite | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const active = sites
    .filter((s) => s.is_active)
    .map((s) => ({ site: s, proj: projectNext(s) }))
    .sort((a, b) => {
      if (a.proj.nextDue === null) return 1;
      if (b.proj.nextDue === null) return -1;
      return a.proj.nextDue.getTime() - b.proj.nextDue.getTime();
    });
  const inactive = sites.filter((s) => !s.is_active);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    const result =
      editing === "new"
        ? await createPumpSite(formData)
        : await updatePumpSite((editing as PumpSite).id, formData);
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
          + Add Client Site
        </button>
      </div>

      {!active.length ? (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-10 text-center text-[#5a6b85]">
          No sites yet. Add each client site with its pump-out interval.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1]">
                <th className="px-5 py-3.5 font-semibold">Client / Site</th>
                <th className="px-5 py-3.5 font-semibold">Address</th>
                <th className="px-5 py-3.5 font-semibold">Interval</th>
                <th className="px-5 py-3.5 font-semibold">Last pumped</th>
                <th className="px-5 py-3.5 font-semibold">Projected window</th>
                <th className="px-5 py-3.5 font-semibold">Due</th>
                <th className="w-40" />
              </tr>
            </thead>
            <tbody>
              {active.map(({ site, proj }) => (
                <tr
                  key={site.id}
                  className="border-b border-[#e4e9f1] last:border-0"
                >
                  <td className="px-5 py-3.5">
                    <div className="font-semibold">{site.client_name}</div>
                    {site.site_label && (
                      <div className="text-xs text-[#5a6b85]">
                        {site.site_label}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[#5a6b85]">{site.address}</td>
                  <td className="px-5 py-3.5">{site.interval_months} mo</td>
                  <td className="px-5 py-3.5 text-[#5a6b85]">
                    {site.last_pumped ?? "never"}
                  </td>
                  <td className="px-5 py-3.5">
                    {proj.nextDue ? (
                      <>
                        {fmtDate(proj.windowStart)} – {fmtDate(proj.windowEnd)}
                      </>
                    ) : (
                      <span className="text-[#5a6b85]">set last pumped</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {proj.daysUntil === null ? (
                      "—"
                    ) : proj.overdue ? (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-[#fbe7e7] text-[#d24b4b]">
                        {Math.abs(proj.daysUntil)}d overdue
                      </span>
                    ) : proj.daysUntil <= 30 ? (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-[#fff2e3] text-[#b9700f]">
                        in {proj.daysUntil}d
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-[#e3f6ec] text-[#1f9d63]">
                        in {proj.daysUntil}d
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-3">
                    <button
                      onClick={() =>
                        markPumped(site.id, new Date().toISOString().slice(0, 10))
                      }
                      className="text-[#1f9d63] font-semibold hover:underline"
                      title="Set last pumped to today"
                    >
                      Pumped today
                    </button>
                    <button
                      onClick={() => setEditing(site)}
                      className="text-[#2f6fd6] font-semibold hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => togglePumpSite(site.id, false)}
                      className="text-[#5a6b85] font-semibold hover:underline"
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inactive.length > 0 && (
        <div className="mt-4 text-sm text-[#5a6b85]">
          {inactive.length} archived site{inactive.length > 1 ? "s" : ""}:{" "}
          {inactive.map((s, i) => (
            <span key={s.id}>
              {i > 0 && ", "}
              {s.client_name}{" "}
              <button
                onClick={() => togglePumpSite(s.id, true)}
                className="text-[#2f6fd6] hover:underline"
              >
                (restore)
              </button>
            </span>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-4">
              {editing === "new" ? "Add Client Site" : "Edit Client Site"}
            </h2>
            <form action={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field
                  name="client_name"
                  label="Client name"
                  required
                  defaultValue={current?.client_name}
                />
                <Field
                  name="site_label"
                  label="Site label (optional)"
                  defaultValue={current?.site_label ?? ""}
                />
              </div>
              <Field
                name="address"
                label="Address"
                required
                defaultValue={current?.address}
              />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Interval (months)
                  </label>
                  <input
                    name="interval_months"
                    type="number"
                    min="1"
                    max="60"
                    required
                    defaultValue={current?.interval_months ?? 6}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Window (± days)
                  </label>
                  <input
                    name="window_days"
                    type="number"
                    min="0"
                    max="90"
                    defaultValue={current?.window_days ?? 14}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Last pumped
                  </label>
                  <input
                    name="last_pumped"
                    type="date"
                    defaultValue={current?.last_pumped ?? ""}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
              </div>
              <Field
                name="notes"
                label="Notes"
                defaultValue={current?.notes ?? ""}
              />
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
                  {saving ? "Saving…" : "Save site"}
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
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
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
        className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
      />
    </div>
  );
}
