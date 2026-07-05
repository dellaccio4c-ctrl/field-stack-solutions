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
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ff8a1e] to-[#ffa347] flex items-center justify-center text-white font-extrabold text-lg">
            F
          </div>
          <div>
            <div className="font-extrabold text-lg text-[#0e1f38] leading-tight">
              Field Stack Solutions
            </div>
            <div className="text-[11px] tracking-widest font-semibold text-[#b9700f]">
              PORTAL LOGIN
            </div>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#0e1726] mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "Signing in…" : "Sign in"}
          </button>
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
