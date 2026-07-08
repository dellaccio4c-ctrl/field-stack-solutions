"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(search.get("next") ?? "/app");
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
            PORTAL LOGIN
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#0e1726] mb-1">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#e4e9f1] rounded-lg px-3 py-3 text-base text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#0e1726] mb-1">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#e4e9f1] rounded-lg px-3 py-3 text-base text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]"
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
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <a
            href="/forgot"
            className="block text-center text-sm font-semibold text-[#b9700f] hover:underline"
          >
            Forgot password?
          </a>
        </form>
        <p className="text-xs text-[#5a6b85] mt-6 text-center">
          Accounts are created by your administrator.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
