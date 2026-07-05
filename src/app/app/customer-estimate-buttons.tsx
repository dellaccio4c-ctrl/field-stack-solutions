"use client";

import { useState } from "react";
import { customerDecideEstimate } from "./estimates/actions";

export function CustomerEstimateButtons({ estimateId }: { estimateId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approved" | "declined") {
    setBusy(true);
    setError(null);
    const result = await customerDecideEstimate(estimateId, decision);
    setBusy(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => decide("approved")}
        disabled={busy}
        className="bg-[#1f9d63] hover:opacity-90 text-white font-semibold rounded-lg px-4 py-2 text-sm transition disabled:opacity-60"
      >
        Approve
      </button>
      <button
        onClick={() => decide("declined")}
        disabled={busy}
        className="bg-white border border-[#e4e9f1] hover:border-[#d24b4b] text-[#d24b4b] font-semibold rounded-lg px-4 py-2 text-sm transition disabled:opacity-60"
      >
        Decline
      </button>
      {error && <span className="text-sm text-[#d24b4b]">{error}</span>}
    </div>
  );
}
