"use client";

import { useState } from "react";
import { setEstimateStatus, convertToInvoice, emailEstimate } from "../actions";

export function EstimateActions({
  estimateId,
  status,
}: {
  estimateId: string;
  status: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<{ error: string | null } | void>) {
    setBusy(true);
    setError(null);
    const result = await fn();
    setBusy(false);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2 flex-wrap justify-end">
        <a
          href={`/app/estimates/${estimateId}/pdf`}
          target="_blank"
          className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] text-[#0e1726] font-semibold rounded-lg px-4 py-2 text-sm transition"
        >
          Download PDF
        </a>
        {(status === "draft" || status === "sent") && (
          <Btn
            onClick={() => run(() => emailEstimate(estimateId))}
            disabled={busy}
          >
            Email to customer
          </Btn>
        )}
        {status === "draft" && (
          <Btn
            onClick={() => run(() => setEstimateStatus(estimateId, "sent"))}
            disabled={busy}
            primary
          >
            Mark as sent
          </Btn>
        )}
        {status === "sent" && (
          <>
            <Btn
              onClick={() => run(() => setEstimateStatus(estimateId, "approved"))}
              disabled={busy}
              primary
            >
              Mark approved
            </Btn>
            <Btn
              onClick={() => run(() => setEstimateStatus(estimateId, "declined"))}
              disabled={busy}
            >
              Mark declined
            </Btn>
          </>
        )}
        {status === "approved" && (
          <Btn
            onClick={() => run(() => convertToInvoice(estimateId))}
            disabled={busy}
            primary
          >
            Convert to invoice →
          </Btn>
        )}
        {(status === "sent" || status === "declined") && (
          <Btn
            onClick={() => run(() => setEstimateStatus(estimateId, "draft"))}
            disabled={busy}
          >
            Back to draft
          </Btn>
        )}
      </div>
      {error && <div className="text-sm text-[#d24b4b]">{error}</div>}
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  primary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        primary
          ? "bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-4 py-2 text-sm transition disabled:opacity-60"
          : "bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] text-[#0e1726] font-semibold rounded-lg px-4 py-2 text-sm transition disabled:opacity-60"
      }
    >
      {children}
    </button>
  );
}
