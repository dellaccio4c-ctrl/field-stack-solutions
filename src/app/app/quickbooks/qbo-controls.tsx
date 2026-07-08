"use client";

import { useState } from "react";
import { syncToQbo, disconnectQbo } from "./actions";

export function QboControls({
  connection,
  linkCount,
}: {
  connection: {
    realmId: string;
    connectedAt: string;
    lastSyncAt: string | null;
    lastError: string | null;
  } | null;
  linkCount: number;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function runSync() {
    setBusy(true);
    setMsg(null);
    const res = await syncToQbo();
    setBusy(false);
    if (res.error) {
      setIsError(true);
      setMsg(res.error);
      return;
    }
    setIsError(false);
    const c = res.synced!;
    setMsg(
      `Synced — ${c.invoices} invoices, ${c.payments} payments, ${c.expenses} expenses, ${c.customers} new customers pushed to QuickBooks.`
    );
  }

  if (!connection)
    return (
      <div className="bg-white rounded-2xl border border-[#e4e9f1] p-6 shadow-sm">
        <div className="font-bold text-[#0e1726] mb-2">Not connected</div>
        <p className="text-sm text-[#5a6b85] mb-4">
          Connect your QuickBooks Online company. You&apos;ll sign in at Intuit
          and authorize FieldStack — takes about 30 seconds.
        </p>
        <a
          href="/api/quickbooks/connect"
          className="inline-block bg-[#2ca01c] hover:opacity-90 text-white font-bold rounded-lg px-6 py-2.5 text-sm transition"
        >
          Connect to QuickBooks
        </a>
      </div>
    );

  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full bg-[#1f9d63]" />
        <span className="font-bold text-[#0e1726]">Connected</span>
      </div>
      <div className="text-sm text-[#5a6b85] space-y-1 mb-4">
        <div>Company ID: {connection.realmId}</div>
        <div>
          Last sync:{" "}
          {connection.lastSyncAt
            ? new Date(connection.lastSyncAt).toLocaleString()
            : "never"}
          {" · "}
          {linkCount.toLocaleString()} records linked
        </div>
        {connection.lastError && (
          <div className="text-[#d24b4b]">Last error: {connection.lastError}</div>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={runSync}
          disabled={busy}
          className="bg-[#0e1f38] hover:bg-[#15294a] text-white font-semibold rounded-lg px-5 py-2.5 text-sm transition disabled:opacity-60"
        >
          {busy ? "Syncing…" : "Sync now"}
        </button>
        <button
          onClick={async () => {
            if (!confirm("Disconnect QuickBooks? Synced records stay in QuickBooks; the link records are kept for when you reconnect.")) return;
            await disconnectQbo();
          }}
          className="border border-[#e4e9f1] hover:border-[#d24b4b] hover:text-[#d24b4b] text-[#5a6b85] font-semibold rounded-lg px-4 py-2.5 text-sm transition"
        >
          Disconnect
        </button>
      </div>
      {msg && (
        <div
          className={`text-sm rounded-lg px-3 py-2 mt-3 ${
            isError ? "text-[#d24b4b] bg-[#fbe7e7]" : "text-[#1f9d63] bg-[#e3f6ec]"
          }`}
        >
          {msg}
        </div>
      )}
    </div>
  );
}
