"use client";

import { useState } from "react";
import { runPmGeneration } from "./actions";

export function GeneratePmButton() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setStatus(null);
    const { error, result } = await runPmGeneration();
    setBusy(false);
    if (error) {
      setStatus(error);
      return;
    }
    if (result) {
      const created = result.pumpCreated + result.equipmentCreated;
      setStatus(
        created === 0
          ? `Nothing due — ${result.skipped} already have open orders.`
          : `Created ${created} PM order${created === 1 ? "" : "s"} (${result.pumpCreated} pump-outs, ${result.equipmentCreated} equipment).`
      );
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={run}
        disabled={busy}
        title="Create work orders for pump sites and equipment that are due for service (also runs automatically every morning)"
        className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] text-[#0e1726] font-semibold rounded-lg px-4 py-2 text-sm transition disabled:opacity-60"
      >
        {busy ? "Checking…" : "⟳ Generate PM orders"}
      </button>
      {status && <span className="text-xs text-[#5a6b85]">{status}</span>}
    </span>
  );
}
