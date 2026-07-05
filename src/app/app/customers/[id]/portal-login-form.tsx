"use client";

import { useState } from "react";
import { createCustomerLogin } from "../actions";

export function PortalLoginForm({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    const result = await createCustomerLogin(customerId, formData);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEmail(String(formData.get("email")));
    setTempPassword(result.tempPassword);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] text-[#0e1726] font-semibold rounded-lg px-4 py-2 text-sm transition"
      >
        + Portal Login
      </button>

      {tempPassword && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#e3f6ec] border border-[#1f9d63]/40 rounded-2xl p-5 shadow-xl max-w-sm">
          <div className="font-bold text-[#1f9d63] mb-1">
            Portal login created for {email}
          </div>
          <div className="text-sm text-[#0e1726]">
            Temporary password (shown once):{" "}
            <code className="bg-white px-2 py-1 rounded font-bold select-all">
              {tempPassword}
            </code>
          </div>
          <button
            onClick={() => setTempPassword(null)}
            className="text-sm text-[#5a6b85] underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-1">
              Create Portal Login
            </h2>
            <p className="text-sm text-[#5a6b85] mb-4">
              Gives this customer a login to view estimates, invoices, and
              per-site totals. They can only ever see their own data.
            </p>
            <form action={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Contact name
                </label>
                <input
                  name="full_name"
                  required
                  className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Login email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                />
              </div>
              {error && (
                <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
                >
                  {saving ? "Creating…" : "Create login"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-5 border border-[#e4e9f1] rounded-lg font-semibold text-[#0e1726] hover:border-[#ff8a1e]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
