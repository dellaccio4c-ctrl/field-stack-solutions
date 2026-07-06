"use client";

import { useRef, useState } from "react";
import { submitEntry, type FormField } from "../actions";

const inputCls =
  "block mt-1 w-full border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]";
const labelCls = "block text-xs font-semibold text-[#5a6b85]";

export function EntryForm({
  formId,
  fields,
  locations,
}: {
  formId: string;
  fields: FormField[];
  locations: { id: string; label: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLFormElement>(null);

  async function handleSubmit(fd: FormData) {
    setBusy(true);
    setError(null);
    setDone(false);
    const res = await submitEntry(formId, fd);
    setBusy(false);
    if (res.error) return setError(res.error);
    setDone(true);
    ref.current?.reset();
  }

  return (
    <form
      ref={ref}
      action={handleSubmit}
      className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm p-5 space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          Site
          <select name="location_id" className={inputCls}>
            <option value="">—</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Date
          <input
            name="entry_date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={inputCls}
          />
        </label>
      </div>

      {fields.map((f) =>
        f.type === "checkbox" ? (
          <label key={f.key} className="flex items-center gap-2 text-sm text-[#0e1726]">
            <input type="checkbox" name={`f_${f.key}`} className="w-4 h-4 accent-[#ff8a1e]" />
            {f.label}
          </label>
        ) : (
          <label key={f.key} className={labelCls}>
            {f.label}
            {f.required ? " *" : ""}
            {f.type === "textarea" ? (
              <textarea name={`f_${f.key}`} rows={3} required={f.required} className={inputCls} />
            ) : f.type === "select" ? (
              <select name={`f_${f.key}`} required={f.required} className={inputCls}>
                <option value="">—</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={`f_${f.key}`}
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                step={f.type === "number" ? "any" : undefined}
                required={f.required}
                className={inputCls}
              />
            )}
          </label>
        )
      )}

      {error && (
        <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2">{error}</div>
      )}
      {done && (
        <div className="text-sm text-[#1f9d63] bg-[#e3f6ec] rounded-lg px-3 py-2">
          Entry submitted.
        </div>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Submit entry"}
      </button>
    </form>
  );
}
