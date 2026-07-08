"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
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
            RESET PASSWORD
          </div>
        </div>

        {sent ? (
          <div>
            <div className="text-sm text-[#1f9d63] bg-[#e3f6ec] rounded-lg px-3 py-3 mb-4">
              If an account exists for <b>{email}</b>, a reset link is on its
              way. Open it <b>on this device</b> and you&apos;ll be taken to
              set a new password.
            </div>
            <Link
              href="/login"
              className="block text-center text-sm font-semibold text-[#b9700f] hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-[#5a6b85]">
              Enter your work email and we&apos;ll send you a password reset
              link.
            </p>
            <div>
              <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <Link
              href="/login"
              className="block text-center text-sm text-[#5a6b85] hover:text-[#b9700f]"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
