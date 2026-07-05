"use client";

import { useState } from "react";
import { setInvoiceStatus, recordPayment, emailInvoice } from "../actions";

export function InvoiceActions({
  invoiceId,
  status,
  balance,
}: {
  invoiceId: string;
  status: string;
  balance: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  async function run(fn: () => Promise<{ error: string | null }>) {
    setBusy(true);
    setError(null);
    const result = await fn();
    setBusy(false);
    if (result.error) setError(result.error);
    return result;
  }

  async function handlePayment(formData: FormData) {
    const result = await run(() => recordPayment(invoiceId, formData));
    if (!result.error) setPayOpen(false);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2 flex-wrap justify-end">
        <a
          href={`/app/invoices/${invoiceId}/pdf`}
          target="_blank"
          className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] text-[#0e1726] font-semibold rounded-lg px-4 py-2 text-sm transition"
        >
          Download PDF
        </a>
        {status !== "void" && status !== "paid" && (
          <Btn onClick={() => run(() => emailInvoice(invoiceId))} disabled={busy}>
            Email to customer
          </Btn>
        )}
        {status === "draft" && (
          <Btn
            onClick={() => run(() => setInvoiceStatus(invoiceId, "sent"))}
            disabled={busy}
            primary
          >
            Mark as sent
          </Btn>
        )}
        {(status === "sent" ||
          status === "partially_paid" ||
          status === "overdue") && (
          <Btn onClick={() => setPayOpen(true)} disabled={busy} primary>
            Record payment
          </Btn>
        )}
        {status !== "void" && status !== "paid" && (
          <Btn
            onClick={() => run(() => setInvoiceStatus(invoiceId, "void"))}
            disabled={busy}
          >
            Void
          </Btn>
        )}
      </div>
      {error && <div className="text-sm text-[#d24b4b]">{error}</div>}

      {payOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-1">
              Record payment
            </h2>
            <p className="text-sm text-[#5a6b85] mb-4">
              Balance due:{" "}
              <b>
                {balance.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
              </b>
            </p>
            <form action={handlePayment} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Amount
                </label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={balance > 0 ? balance.toFixed(2) : undefined}
                  className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#ff8a1e]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Method
                </label>
                <select
                  name="method"
                  className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-[#ff8a1e]"
                >
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="ach">ACH / bank transfer</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Save payment"}
                </button>
                <button
                  type="button"
                  onClick={() => setPayOpen(false)}
                  className="px-5 border border-[#e4e9f1] rounded-lg font-semibold text-[#0e1726] hover:border-[#ff8a1e]"
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
