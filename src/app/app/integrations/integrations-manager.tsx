"use client";

import { useState } from "react";
import { PROVIDERS, type ProviderKey } from "@/lib/integrations";
import { createIntegration, deleteIntegration, syncIntegration } from "./actions";

type Row = {
  id: string;
  provider: string;
  providerLabel: string;
  name: string;
  api_base_url: string | null;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  recordCount: number;
  totalAmount: string;
};

const STATUS_STYLE: Record<string, string> = {
  connected: "bg-[#e3f6ec] text-[#1f9d63]",
  error: "bg-[#fbe7e7] text-[#d24b4b]",
  disconnected: "bg-[#eef1f6] text-[#5a6b85]",
};

export function IntegrationsManager({ integrations }: { integrations: Row[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleCreate(formData: FormData) {
    setError(null);
    const res = await createIntegration(formData);
    if (res.error) {
      setError(res.error);
      return;
    }
    setOpen(false);
  }

  async function handleSync(id: string, name: string) {
    setBusyId(id);
    setNotice(null);
    setError(null);
    const res = await syncIntegration(id);
    setBusyId(null);
    if (res.error) {
      setError(`${name}: ${res.error}`);
      return;
    }
    setNotice(
      `${name}: synced — ${res.imported} new sales record${res.imported === 1 ? "" : "s"} imported.`
    );
  }

  async function handleDelete(id: string, name: string) {
    if (
      !confirm(
        `Remove the "${name}" connection? Its synced sales records will be deleted too.`
      )
    )
      return;
    setBusyId(id);
    const res = await deleteIntegration(id);
    setBusyId(null);
    if (res.error) setError(res.error);
  }

  return (
    <div>
      <div className="mb-5">
        <button
          onClick={() => setOpen(true)}
          className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2.5 text-sm transition"
        >
          Add connection
        </button>
      </div>

      {error && (
        <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2 mb-4">
          {error}
        </div>
      )}
      {notice && (
        <div className="text-sm text-[#1f9d63] bg-[#e3f6ec] rounded-lg px-3 py-2 mb-4">
          {notice}
        </div>
      )}

      {!integrations.length ? (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-10 text-center text-[#5a6b85]">
          No sales systems connected yet. Add your first connection to start
          pulling revenue into the dashboard.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {integrations.map((i) => (
            <div
              key={i.id}
              className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="font-extrabold text-[#0e1726]">{i.name}</div>
                  <div className="text-xs text-[#5a6b85]">{i.providerLabel}</div>
                </div>
                <span
                  className={`text-xs font-bold rounded-full px-3 py-1 capitalize ${STATUS_STYLE[i.status] ?? STATUS_STYLE.disconnected}`}
                >
                  {i.status}
                </span>
              </div>

              <div className="text-sm text-[#5a6b85] space-y-1 mb-4">
                <div>
                  {i.recordCount.toLocaleString()} sales records ·{" "}
                  <span className="font-semibold text-[#0e1726]">
                    {i.totalAmount}
                  </span>
                </div>
                <div>
                  Last sync:{" "}
                  {i.last_sync_at
                    ? new Date(i.last_sync_at).toLocaleString()
                    : "never"}
                </div>
                {i.last_error && (
                  <div className="text-[#d24b4b]">{i.last_error}</div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSync(i.id, i.name)}
                  disabled={busyId === i.id}
                  className="bg-[#0e1f38] hover:bg-[#15294a] text-white font-semibold rounded-lg px-4 py-2 text-sm transition disabled:opacity-60"
                >
                  {busyId === i.id ? "Syncing…" : "Sync now"}
                </button>
                <button
                  onClick={() => handleDelete(i.id, i.name)}
                  disabled={busyId === i.id}
                  className="border border-[#e4e9f1] hover:border-[#d24b4b] hover:text-[#d24b4b] text-[#5a6b85] font-semibold rounded-lg px-4 py-2 text-sm transition"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-1">
              Add sales system
            </h2>
            <p className="text-sm text-[#5a6b85] mb-4">
              Enter the API details from the provider&apos;s dashboard. The
              connector expects a JSON feed of sales with an id, date, and
              amount per record — field names are matched flexibly.
            </p>
            <form action={handleCreate} className="space-y-4">
              <label className="block text-xs font-semibold text-[#5a6b85]">
                System
                <select
                  name="provider"
                  className="block mt-1 w-full border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]"
                >
                  {(Object.keys(PROVIDERS) as ProviderKey[]).map((k) => (
                    <option key={k} value={k}>
                      {PROVIDERS[k].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-[#5a6b85]">
                Connection name
                <input
                  name="name"
                  required
                  placeholder="e.g. Sud Stop Pensacola POS"
                  className="block mt-1 w-full border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]"
                />
              </label>
              <label className="block text-xs font-semibold text-[#5a6b85]">
                API base URL
                <input
                  name="api_base_url"
                  placeholder="https://api.example.com"
                  className="block mt-1 w-full border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]"
                />
              </label>
              <label className="block text-xs font-semibold text-[#5a6b85]">
                API key
                <input
                  name="api_key"
                  type="password"
                  placeholder="Paste the key from the provider"
                  className="block mt-1 w-full border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]"
                />
              </label>
              {error && (
                <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-2.5 transition"
                >
                  Save connection
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                  }}
                  className="px-5 py-2.5 border border-[#e4e9f1] rounded-lg font-semibold text-[#0e1726] hover:border-[#ff8a1e]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
