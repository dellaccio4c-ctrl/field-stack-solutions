"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ProfileForm({
  defaults,
}: {
  defaults: { preferred_name: string; phone: string; personal_email: string };
}) {
  const router = useRouter();
  const [preferredName, setPreferredName] = useState(defaults.preferred_name);
  const [phone, setPhone] = useState(defaults.phone);
  const [personalEmail, setPersonalEmail] = useState(defaults.personal_email);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({
        preferred_name: preferredName.trim() || null,
        phone: phone.trim() || null,
        personal_email: personalEmail.trim() || null,
      })
      .eq("id", user!.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] p-6 shadow-sm mb-6">
      <h2 className="text-lg font-extrabold text-[#0e1726] mb-1">My details</h2>
      <p className="text-sm text-[#5a6b85] mb-4">
        You can update your preferred name, phone number, and personal email.
        Legal name and employee details are managed by an Admin.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-semibold text-[#0e1726] mb-1">
            Preferred name
          </label>
          <input
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            placeholder="What should we call you?"
            className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#ff8a1e]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-[#0e1726] mb-1">
              Phone number
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#ff8a1e]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#0e1726] mb-1">
              Personal email (optional)
            </label>
            <input
              type="email"
              value={personalEmail}
              onChange={(e) => setPersonalEmail(e.target.value)}
              className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#ff8a1e]"
            />
          </div>
        </div>
        {error && (
          <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {done && (
          <div className="text-sm text-[#1f9d63] bg-[#e3f6ec] rounded-lg px-3 py-2">
            Details updated.
          </div>
        )}
        <button
          type="submit"
          disabled={saving}
          className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-6 py-2.5 transition disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save details"}
        </button>
      </form>
    </div>
  );
}
