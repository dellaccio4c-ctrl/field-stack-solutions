"use client";

import { useState } from "react";
import { setPartsMarkup } from "./actions";

export function MarkupSettings({ current }: { current: number }) {
  const [value, setValue] = useState(String(current));
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await setPartsMarkup(parseFloat(value));
    setBusy(false);
    setMsg(res.error ?? "Saved.");
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] p-4 mb-5 flex items-end gap-3 flex-wrap">
      <label className="text-xs font-semibold text-[#5a6b85]">
        Parts markup % (owner) — applied to cost when quoting on estimates
        <input
          type="number"
          step="0.5"
          min="0"
          max="500"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="block mt-1 border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] w-28 focus:outline-none focus:border-[#ff8a1e]"
        />
      </label>
      <button
        onClick={save}
        disabled={busy}
        className="bg-[#0e1f38] hover:bg-[#15294a] text-white font-semibold rounded-lg px-4 py-2 text-sm transition disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save markup"}
      </button>
      {msg && (
        <span className={`text-xs pb-2 ${msg === "Saved." ? "text-[#1f9d63]" : "text-[#d24b4b]"}`}>{msg}</span>
      )}
    </div>
  );
}
