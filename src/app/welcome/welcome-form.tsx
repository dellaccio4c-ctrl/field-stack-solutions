"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function WelcomeForm({
  defaults,
}: {
  defaults: { preferred_name: string; phone: string; personal_email: string };
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [preferredName, setPreferredName] = useState(defaults.preferred_name);
  const [phone, setPhone] = useState(defaults.phone);
  const [personalEmail, setPersonalEmail] = useState(defaults.personal_email);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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

    const { error: pwErr } = await supabase.auth.updateUser({ password });
    if (pwErr) {
      setSaving(false);
      setError(pwErr.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: profErr } = await supabase
      .from("profiles")
      .update({
        preferred_name: preferredName.trim() || null,
        phone: phone.trim() || null,
        personal_email: personalEmail.trim() || null,
      })
      .eq("id", user!.id);
    setSaving(false);
    if (profErr) {
      setError(profErr.message);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field
        label="Preferred name"
        value={preferredName}
        onChange={setPreferredName}
        placeholder="What should we call you?"
      />
      <Field label="Phone number" value={phone} onChange={setPhone} />
      <Field
        label="Personal email (optional)"
        value={personalEmail}
        onChange={setPersonalEmail}
        type="email"
      />
      <hr className="border-[#e4e9f1] my-2" />
      <Field
        label="Choose a password"
        value={password}
        onChange={setPassword}
        type="password"
        required
      />
      <Field
        label="Confirm password"
        value={confirm}
        onChange={setConfirm}
        type="password"
        required
      />
      {error && (
        <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-3 transition disabled:opacity-60"
      >
        {saving ? "Saving…" : "Finish setup →"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#0e1726] mb-1">
        {label}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#ff8a1e]"
      />
    </div>
  );
}
