"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setPassword("");
    setConfirm("");
    setDone(true);
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] p-6 shadow-sm">
      <h2 className="text-lg font-extrabold text-[#0e1726] mb-1">
        Change password
      </h2>
      <p className="text-sm text-[#5a6b85] mb-4">
        If you were given a temporary password, set your own here.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-semibold text-[#0e1726] mb-1">
            New password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#ff8a1e]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#0e1726] mb-1">
            Confirm new password
          </label>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#ff8a1e]"
          />
        </div>
        {error && (
          <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {done && (
          <div className="text-sm text-[#1f9d63] bg-[#e3f6ec] rounded-lg px-3 py-2">
            Password updated.
          </div>
        )}
        <button
          type="submit"
          disabled={saving}
          className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-6 py-2.5 transition disabled:opacity-60"
        >
          {saving ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
