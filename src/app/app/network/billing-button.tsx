"use client";

import { useState } from "react";
import { generateCircuitBilling } from "./actions";

export function BillingButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function run() {
    setBusy(true);
    setMsg(null);
    const res = await generateCircuitBilling();
    setBusy(false);
    if (res.error) {
      setIsError(true);
      setMsg(res.error);
      return;
    }
    setIsError(false);
    setMsg(
      res.invoices === 0
        ? "Nothing to bill — every active circuit is already invoiced this month."
        : `Created ${res.invoices} draft invoice${res.invoices === 1 ? "" : "s"} covering ${res.circuits} circuit${res.circuits === 1 ? "" : "s"}. Review them under Invoices before sending.`
    );
  }

  return (
    <span className="inline-flex items-center gap-3 flex-wrap">
      {msg && (
        <span className={`text-xs ${isError ? "text-[#d24b4b]" : "text-[#1f9d63]"}`}>
          {msg}
        </span>
      )}
      <button
        onClick={run}
        disabled={busy}
        className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] text-[#0e1726] font-semibold rounded-lg px-4 py-2 text-sm transition disabled:opacity-60"
      >
        {busy ? "Generating…" : "Generate monthly invoices"}
      </button>
    </span>
  );
}
