"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  setWorkOrderStatus,
  assignWorkOrder,
  scheduleWorkOrder,
  createInvoiceFromWorkOrder,
} from "../actions";

type Staff = { id: string; full_name: string; preferred_name: string | null };

export function WorkOrderActions({
  workOrderId,
  status,
  assignedTo,
  scheduledDate,
  scheduledEnd,
  staff,
  hasInvoice = false,
  hasCustomer = false,
}: {
  workOrderId: string;
  status: string;
  assignedTo: string | null;
  scheduledDate: string | null;
  scheduledEnd: string | null;
  staff: Staff[];
  hasInvoice?: boolean;
  hasCustomer?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  async function run(fn: () => Promise<{ error: string | null }>) {
    setBusy(true);
    setError(null);
    const result = await fn();
    setBusy(false);
    if (result.error) setError(result.error);
    return result;
  }

  const active = !["completed", "cancelled"].includes(status);

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2 flex-wrap justify-end items-center">
        {active && (
          <select
            value={assignedTo ?? ""}
            onChange={(e) =>
              run(() => assignWorkOrder(workOrderId, e.target.value || null))
            }
            disabled={busy}
            className="border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white text-sm font-semibold focus:outline-none focus:border-[#ff8a1e]"
          >
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.preferred_name || s.full_name}
              </option>
            ))}
          </select>
        )}

        {active && (
          <Btn onClick={() => setScheduleOpen(true)} disabled={busy}>
            📅 Schedule
          </Btn>
        )}

        {(status === "open" || status === "scheduled" || status === "on_hold") && (
          <Btn
            onClick={() => run(() => setWorkOrderStatus(workOrderId, "in_progress"))}
            disabled={busy}
            primary
          >
            ▶ Start work
          </Btn>
        )}
        {status === "in_progress" && (
          <>
            <Btn onClick={() => setCompleteOpen(true)} disabled={busy} primary>
              ✓ Complete
            </Btn>
            <Btn
              onClick={() => run(() => setWorkOrderStatus(workOrderId, "on_hold"))}
              disabled={busy}
            >
              ⏸ Hold
            </Btn>
          </>
        )}
        {active && status !== "in_progress" && (
          <Btn
            onClick={() => run(() => setWorkOrderStatus(workOrderId, "cancelled"))}
            disabled={busy}
          >
            Cancel WO
          </Btn>
        )}
        {status === "completed" && !hasInvoice && hasCustomer && (
          <Btn
            onClick={async () => {
              setBusy(true);
              setError(null);
              const result = await createInvoiceFromWorkOrder(workOrderId);
              setBusy(false);
              if (result.error) setError(result.error);
              else if (result.invoiceId)
                router.push(`/app/invoices/${result.invoiceId}`);
            }}
            disabled={busy}
            primary
          >
            💳 Create invoice
          </Btn>
        )}
        {!active && (
          <Btn
            onClick={() => run(() => setWorkOrderStatus(workOrderId, "open"))}
            disabled={busy}
          >
            Reopen
          </Btn>
        )}
      </div>
      {error && <div className="text-sm text-[#d24b4b]">{error}</div>}

      {completeOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-1">
              Complete work order
            </h2>
            <p className="text-sm text-[#5a6b85] mb-4">
              Completion is time-stamped automatically. Optionally report time
              on site.
            </p>
            <form
              action={async (formData) => {
                const mins = parseInt(String(formData.get("minutes") || "0"), 10);
                const result = await run(() =>
                  setWorkOrderStatus(workOrderId, "completed", mins || undefined)
                );
                if (!result.error) setCompleteOpen(false);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Minutes on site (optional)
                </label>
                <input
                  name="minutes"
                  type="number"
                  min="0"
                  step="5"
                  placeholder="e.g. 90"
                  className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#ff8a1e]"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 bg-[#1f9d63] hover:opacity-90 text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Mark completed"}
                </button>
                <button
                  type="button"
                  onClick={() => setCompleteOpen(false)}
                  className="px-5 border border-[#e4e9f1] rounded-lg font-semibold text-[#0e1726] hover:border-[#ff8a1e]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {scheduleOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-4">
              Schedule work order
            </h2>
            <form
              action={async (formData) => {
                const result = await run(() =>
                  scheduleWorkOrder(workOrderId, formData)
                );
                if (!result.error) setScheduleOpen(false);
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Start date
                  </label>
                  <input
                    name="scheduled_date"
                    type="date"
                    defaultValue={scheduledDate ?? ""}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    End date (optional)
                  </label>
                  <input
                    name="scheduled_end"
                    type="date"
                    defaultValue={scheduledEnd ?? ""}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Save schedule"}
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleOpen(false)}
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
