"use client";

import { useState } from "react";
import { locateMissingSitePins } from "../customers/actions";

export function LocateSitePinsButton({ missingCount }: { missingCount: number }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (missingCount === 0 && !status) return null;

  async function run() {
    setBusy(true);
    setStatus("Looking up addresses…");
    const res = await locateMissingSitePins();
    setBusy(false);
    setStatus(
      res.remaining > 0
        ? `Placed ${res.located} pins — ${res.remaining} to go, click again.`
        : "All pins placed."
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={run}
        disabled={busy}
        className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] text-[#0e1726] font-semibold rounded-lg px-4 py-2 text-sm transition disabled:opacity-60"
      >
        {busy ? "Locating…" : `Locate map pins (${missingCount})`}
      </button>
      {status && <span className="text-xs text-[#5a6b85]">{status}</span>}
    </span>
  );
}
