"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setReady(!!user));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8)
      return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e1f38] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/fss-wordmark.png"
            alt="Field Stack Solutions"
            className="h-16 object-contain -ml-2"
          />
          <div className="text-[11px] tracking-widest font-semibold text-[#b9700f] mt-1">
            SET NEW PASSWORD
          </div>
        </div>

        {ready === null ? (
          <p className="text-sm text-[#5a6b85]">Checking your reset link…</p>
        ) : !ready ? (
          <div>
            <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-3 mb-4">
              This reset link is invalid or has expired — links work once and
              expire after a while. Request a fresh one below.
            </div>
            <Link
              href="/forgot"
              className="block text-center bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-3 transition"
            >
              Request a new reset link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                New password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                Confirm new password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]"
              />
            </div>
            {error && (
              <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-3 transition disabled:opacity-60"
            >
              {loading ? "Saving…" : "Set password & sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
