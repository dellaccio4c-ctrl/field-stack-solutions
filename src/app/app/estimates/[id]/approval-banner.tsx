"use client";

import { useState } from "react";
import { approveEstimate } from "../actions";

export function ApprovalBanner({
  estimateId,
  approvalStatus,
  approverName,
  canApprove,
}: {
  estimateId: string;
  approvalStatus: string;
  approverName: string | null;
  canApprove: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (approvalStatus === "approved") {
    return (
      <div className="bg-[#e3f6ec] border border-[#1f9d63]/30 rounded-2xl px-5 py-3 mb-6 text-sm text-[#1f9d63] font-semibold">
        ✓ Approved{approverName ? ` by ${approverName}` : ""} — clear to send.
      </div>
    );
  }

  if (approvalStatus !== "pending") return null;

  return (
    <div className="bg-[#fff2e3] border border-[#ff8a1e]/40 rounded-2xl px-5 py-4 mb-6 flex items-center justify-between flex-wrap gap-3">
      <div className="text-sm text-[#b9700f] font-semibold">
        ⚠ Over the approval threshold — needs Admin/Owner sign-off before it
        can be sent.
      </div>
      {canApprove && (
        <button
          onClick={async () => {
            setBusy(true);
            setError(null);
            const result = await approveEstimate(estimateId);
            setBusy(false);
            if (result.error) setError(result.error);
          }}
          disabled={busy}
          className="bg-[#1f9d63] hover:opacity-90 text-white font-semibold rounded-lg px-4 py-2 text-sm transition disabled:opacity-60"
        >
          {busy ? "Approving…" : "✓ Approve estimate"}
        </button>
      )}
      {error && <div className="text-sm text-[#d24b4b] w-full">{error}</div>}
    </div>
  );
}
