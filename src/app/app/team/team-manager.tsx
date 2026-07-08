"use client";

import { useState } from "react";
import { inviteUser, changeRole, setActive, updateEmployee, resendInvite } from "./actions";
import { ROLE_LABEL, ROLE_RANK, type UserRole } from "@/lib/roles";

type Member = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  employee_code: string | null;
  job_title: string | null;
  phone: string | null;
  territory: string | null;
  hire_date: string | null;
  notes: string | null;
  legal_first_name: string | null;
  legal_last_name: string | null;
  preferred_name: string | null;
  hourly_cost: number | null;
};

const STAFF_ROLES: UserRole[] = [
  "readonly",
  "field",
  "xpress_pumping",
  "manager",
  "admin",
  "owner",
];

function EField({
  name,
  label,
  required = false,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#0e1726] mb-1">
        {label}
        {required && <span className="text-[#d24b4b]"> *</span>}
      </label>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
      />
    </div>
  );
}

export function TeamManager({
  members,
  myId,
  myRole,
}: {
  members: Member[];
  myId: string;
  myRole: UserRole;
}) {
  const myRank = ROLE_RANK[myRole];
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    link: string;
    emailed: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleInvite(formData: FormData) {
    setSaving(true);
    setError(null);
    const email = String(formData.get("email") ?? "");
    const result = await inviteUser(formData);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setInviteResult({
      email,
      link: result.inviteLink!,
      emailed: result.emailed,
    });
    setInviteOpen(false);
  }

  async function handleRoleChange(member: Member, role: UserRole) {
    setError(null);
    const result = await changeRole(member.id, role);
    if (result.error) setError(result.error);
  }

  async function handleEmployeeSave(formData: FormData) {
    if (!editing) return;
    setEditSaving(true);
    setEditError(null);
    const result = await updateEmployee(editing.id, formData);
    setEditSaving(false);
    if (result.error) {
      setEditError(result.error);
      return;
    }
    setEditing(null);
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => setInviteOpen(true)}
          className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2.5 transition"
        >
          + Add Team Member
        </button>
        {error && (
          <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {inviteResult && (
        <div className="bg-[#e3f6ec] border border-[#1f9d63]/30 rounded-2xl p-5 mb-5">
          <div className="font-bold text-[#1f9d63] mb-1">
            {inviteResult.emailed
              ? `Welcome email sent to ${inviteResult.email}`
              : `Invite created for ${inviteResult.email}`}
          </div>
          <div className="text-sm text-[#0e1726]">
            {inviteResult.emailed
              ? "They'll receive a setup link to choose their password and profile details."
              : "Email sending isn't configured yet — copy this setup link and share it with them securely:"}
          </div>
          {!inviteResult.emailed && (
            <div className="flex items-center gap-2 mt-2">
              <input
                readOnly
                value={inviteResult.link}
                onFocus={(e) => e.target.select()}
                className="flex-1 text-xs border border-[#e4e9f1] rounded-lg px-2 py-1.5 bg-white"
              />
              <button
                onClick={() =>
                  navigator.clipboard.writeText(inviteResult.link)
                }
                className="bg-[#0e1f38] text-white text-xs font-semibold rounded-lg px-3 py-1.5"
              >
                Copy
              </button>
            </div>
          )}
          <button
            onClick={() => setInviteResult(null)}
            className="text-sm text-[#5a6b85] underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1]">
              <th className="px-5 py-3.5 font-semibold">Name</th>
              <th className="px-5 py-3.5 font-semibold">Contact</th>
              <th className="px-5 py-3.5 font-semibold">Code</th>
              <th className="px-5 py-3.5 font-semibold">Territory</th>
              <th className="px-5 py-3.5 font-semibold">Access level</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
              <th className="w-36" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const theirRank = ROLE_RANK[m.role as UserRole] ?? 0;
              const isMe = m.id === myId;
              // Owners can manage anyone but themselves (incl. other owners);
              // everyone else needs a strictly higher rank.
              const canManage = !isMe && (myRank === 5 || myRank > theirRank);
              return (
                <tr
                  key={m.id}
                  className={`border-b border-[#e4e9f1] last:border-0 ${
                    !m.is_active ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <span className="font-semibold">
                      {m.preferred_name || m.full_name || "—"}
                    </span>
                    {m.preferred_name &&
                      m.full_name &&
                      m.preferred_name !== m.full_name && (
                        <span className="ml-1.5 text-xs text-[#5a6b85]">
                          ({m.full_name})
                        </span>
                      )}
                    {isMe && (
                      <span className="ml-2 text-xs text-[#b9700f] font-bold">
                        (you)
                      </span>
                    )}
                    {m.job_title && (
                      <div className="text-xs text-[#5a6b85]">{m.job_title}</div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[#5a6b85]">
                    {m.email}
                    {m.phone && (
                      <div className="text-xs">{m.phone}</div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {m.employee_code ? (
                      <code className="bg-[#f5f7fb] border border-[#e4e9f1] rounded px-2 py-0.5 text-xs font-bold">
                        {m.employee_code}
                      </code>
                    ) : (
                      <span className="text-[#5a6b85]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[#5a6b85]">
                    {m.territory ?? "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    {canManage ? (
                      <select
                        value={m.role}
                        onChange={(e) =>
                          handleRoleChange(m, e.target.value as UserRole)
                        }
                        className="border border-[#e4e9f1] rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[#ff8a1e]"
                      >
                        {STAFF_ROLES.filter(
                          (r) => myRank === 5 || ROLE_RANK[r] < myRank
                        ).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-semibold">
                        {ROLE_LABEL[m.role as UserRole] ?? m.role}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                        m.is_active
                          ? "bg-[#e3f6ec] text-[#1f9d63]"
                          : "bg-[#eef1f6] text-[#5a6b85]"
                      }`}
                    >
                      {m.is_active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-3">
                    <button
                      onClick={() => {
                        setEditError(null);
                        setEditing(m);
                      }}
                      className="text-[#2f6fd6] font-semibold hover:underline"
                    >
                      Edit
                    </button>
                    {canManage && (
                      <button
                        onClick={async () => {
                          setError(null);
                          const r = await resendInvite(m.email);
                          if (r.error) return setError(r.error);
                          setInviteResult({
                            email: m.email,
                            link: r.inviteLink!,
                            emailed: r.emailed,
                          });
                        }}
                        className="text-[#b9700f] font-semibold hover:underline"
                      >
                        New invite link
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => setActive(m.id, !m.is_active)}
                        className="text-[#5a6b85] font-semibold hover:underline"
                      >
                        {m.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-1">
              Edit Employee — {editing.full_name || editing.email}
            </h2>
            <p className="text-sm text-[#5a6b85] mb-4">
              Access level is changed from the table; everything else here.
            </p>
            <form action={handleEmployeeSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <EField
                  name="legal_first_name"
                  label="Legal first name"
                  required
                  defaultValue={
                    editing.legal_first_name ??
                    editing.full_name.split(" ")[0] ??
                    ""
                  }
                />
                <EField
                  name="legal_last_name"
                  label="Legal last name"
                  required
                  defaultValue={
                    editing.legal_last_name ??
                    editing.full_name.split(" ").slice(1).join(" ")
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EField
                  name="job_title"
                  label="Job title"
                  defaultValue={editing.job_title ?? ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EField
                  name="employee_code"
                  label="Employee code"
                  defaultValue={editing.employee_code ?? ""}
                  placeholder="e.g. FSS-014"
                />
                <EField
                  name="phone"
                  label="Phone"
                  defaultValue={editing.phone ?? ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EField
                  name="territory"
                  label="Territory"
                  defaultValue={editing.territory ?? ""}
                  placeholder="e.g. Birmingham Metro"
                />
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Hire date
                  </label>
                  <input
                    name="hire_date"
                    type="date"
                    defaultValue={editing.hire_date ?? ""}
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Labor cost ($/hour)
                  </label>
                  <input
                    name="hourly_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editing.hourly_cost ?? ""}
                    placeholder="used for job costing"
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editing.notes ?? ""}
                  className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                />
              </div>
              {editError && (
                <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2">
                  {editError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
                >
                  {editSaving ? "Saving…" : "Save employee"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-5 border border-[#e4e9f1] rounded-lg font-semibold text-[#0e1726] hover:border-[#ff8a1e]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {inviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-4">
              Add Team Member
            </h2>
            <form action={handleInvite} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <EField name="legal_first_name" label="Legal first name" required />
                <EField name="legal_last_name" label="Legal last name" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                    Email <span className="text-[#d24b4b]">*</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                  />
                </div>
                <EField
                  name="employee_code"
                  label="Employee code"
                  placeholder="e.g. FSS-002"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Access level
                </label>
                <select
                  name="role"
                  className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
                >
                  {STAFF_ROLES.filter(
                    (r) => myRank === 5 || ROLE_RANK[r] < myRank
                  ).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
                >
                  {saving ? "Creating…" : "Create account"}
                </button>
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
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
