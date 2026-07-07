"use client";

import { useEffect, useState } from "react";
import { clockIn, clockOut } from "./actions";

export function ClockCard({
  openEntry,
  workOrders,
}: {
  openEntry: { clockIn: string; woLabel: string | null } | null;
  workOrders: { id: string; label: string }[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [woId, setWoId] = useState("");
  const [notes, setNotes] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!openEntry) return;
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [openEntry]);

  const elapsed = openEntry
    ? Math.max(0, Math.floor((now - new Date(openEntry.clockIn).getTime()) / 60000))
    : 0;

  async function doIn() {
    setBusy(true);
    setError(null);
    const res = await clockIn(woId || null);
    setBusy(false);
    if (res.error) setError(res.error);
  }

  async function doOut() {
    setBusy(true);
    setError(null);
    const res = await clockOut(notes);
    setBusy(false);
    if (res.error) setError(res.error);
    else setNotes("");
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm p-6">
      {openEntry ? (
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-3 h-3 rounded-full bg-[#1f9d63] animate-pulse" />
            <span className="text-lg font-extrabold text-[#0e1726]">
              On the clock — {Math.floor(elapsed / 60)}h {elapsed % 60}m
            </span>
          </div>
          <div className="text-sm text-[#5a6b85] mb-4">
            Since{" "}
            {new Date(openEntry.clockIn).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
            {openEntry.woLabel ? ` · ${openEntry.woLabel}` : ""}
          </div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes for this shift (optional)"
            className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 text-sm bg-white mb-3 focus:outline-none focus:border-[#ff8a1e]"
          />
          <button
            onClick={doOut}
            disabled={busy}
            className="w-full sm:w-auto bg-[#d24b4b] hover:opacity-90 text-white font-bold rounded-xl px-8 py-3 transition disabled:opacity-60"
          >
            {busy ? "Clocking out…" : "Clock out"}
          </button>
        </div>
      ) : (
        <div>
          <div className="text-lg font-extrabold text-[#0e1726] mb-3">
            You&apos;re off the clock
          </div>
          <label className="block text-xs font-semibold text-[#5a6b85] mb-3">
            Working on (optional)
            <select
              value={woId}
              onChange={(e) => setWoId(e.target.value)}
              className="block mt-1 w-full sm:w-96 border border-[#e4e9f1] rounded-lg px-3 py-2.5 text-sm bg-white font-normal text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]"
            >
              <option value="">General shift (no specific work order)</option>
              {workOrders.map((w) => (
                <option key={w.id} value={w.id}>{w.label}</option>
              ))}
            </select>
          </label>
          <button
            onClick={doIn}
            disabled={busy}
            className="w-full sm:w-auto bg-[#1f9d63] hover:opacity-90 text-white font-bold rounded-xl px-8 py-3 transition disabled:opacity-60"
          >
            {busy ? "Clocking in…" : "Clock in"}
          </button>
        </div>
      )}
      {error && (
        <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2 mt-3">{error}</div>
      )}
    </div>
  );
}
