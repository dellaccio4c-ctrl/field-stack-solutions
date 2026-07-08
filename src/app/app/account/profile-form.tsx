"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Defaults = {
  preferred_name: string;
  phone: string;
  personal_email: string;
  legal_first_name?: string;
  legal_last_name?: string;
  employee_code?: string;
  job_title?: string;
  territory?: string;
  hire_date?: string;
  notes?: string;
};

export function ProfileForm({
  defaults,
  extended = false,
}: {
  defaults: Defaults;
  // Admins/Owners may edit their entire record.
  extended?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Defaults>(defaults);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Defaults>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const patch: Record<string, string | null> = {
      preferred_name: form.preferred_name.trim() || null,
      phone: form.phone.trim() || null,
      personal_email: form.personal_email.trim() || null,
    };
    if (extended) {
      const first = (form.legal_first_name ?? "").trim();
      const last = (form.legal_last_name ?? "").trim();
      patch.legal_first_name = first || null;
      patch.legal_last_name = last || null;
      patch.full_name = `${first} ${last}`.trim() || null;
      patch.employee_code = (form.employee_code ?? "").trim() || null;
      patch.job_title = (form.job_title ?? "").trim() || null;
      patch.territory = (form.territory ?? "").trim() || null;
      patch.hire_date = (form.hire_date ?? "").trim() || null;
      patch.notes = (form.notes ?? "").trim() || null;
    }

    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", user!.id);
    setSaving(false);
    if (error) {
      setError(
        error.message.includes("profiles_employee_code_unique")
          ? "That employee code is already in use."
          : error.message
      );
      return;
    }
    setDone(true);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] p-6 shadow-sm mb-6">
      <h2 className="text-lg font-extrabold text-[#0e1726] mb-1">My details</h2>
      <p className="text-sm text-[#5a6b85] mb-4">
        {extended
          ? "As an Admin/Owner you can edit your entire record."
          : "You can update your preferred name, phone number, and personal email. Legal name and employee details are managed by an Admin."}
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        {extended && (
          <div className="grid grid-cols-2 gap-3">
            <F
              label="Legal first name"
              value={form.legal_first_name ?? ""}
              onChange={(v) => set("legal_first_name", v)}
            />
            <F
              label="Legal last name"
              value={form.legal_last_name ?? ""}
              onChange={(v) => set("legal_last_name", v)}
            />
          </div>
        )}
        <F
          label="Preferred name"
          value={form.preferred_name}
          onChange={(v) => set("preferred_name", v)}
          placeholder="What should we call you?"
        />
        <div className="grid grid-cols-2 gap-3">
          <F
            label="Phone number"
            value={form.phone}
            onChange={(v) => set("phone", v)}
          />
          <F
            label="Personal email (optional)"
            value={form.personal_email}
            onChange={(v) => set("personal_email", v)}
            type="email"
          />
        </div>
        {extended && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <F
                label="Employee code"
                value={form.employee_code ?? ""}
                onChange={(v) => set("employee_code", v)}
              />
              <F
                label="Job title"
                value={form.job_title ?? ""}
                onChange={(v) => set("job_title", v)}
              />
              <F
                label="Territory"
                value={form.territory ?? ""}
                onChange={(v) => set("territory", v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F
                label="Hire date"
                value={form.hire_date ?? ""}
                onChange={(v) => set("hire_date", v)}
                type="date"
              />
              <F
                label="Notes"
                value={form.notes ?? ""}
                onChange={(v) => set("notes", v)}
              />
            </div>
          </>
        )}
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

function F({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#0e1726] mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#ff8a1e]"
      />
    </div>
  );
}
