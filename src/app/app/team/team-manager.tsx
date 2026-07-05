"use client";

import { useState } from "react";
import { inviteUser, changeRole, setActive } from "./actions";
import { ROLE_LABEL, ROLE_RANK, type UserRole } from "@/lib/roles";

type Member = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

const STAFF_ROLES: UserRole[] = ["readonly", "field", "manager", "admin", "owner"];

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
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
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
    setInvitedEmail(email);
    setTempPassword(result.tempPassword);
    setInviteOpen(false);
  }

  async function handleRoleChange(member: Member, role: UserRole) {
    setError(null);
    const result = await changeRole(member.id, role);
    if (result.error) setError(result.error);
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

      {tempPassword && (
        <div className="bg-[#e3f6ec] border border-[#1f9d63]/30 rounded-2xl p-5 mb-5">
          <div className="font-bold text-[#1f9d63] mb-1">
            Account created for {invitedEmail}
          </div>
          <div className="text-sm text-[#0e1726]">
            Temporary password (shown once — share it with them securely):{" "}
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

      <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1]">
              <th className="px-5 py-3.5 font-semibold">Name</th>
              <th className="px-5 py-3.5 font-semibold">Email</th>
              <th className="px-5 py-3.5 font-semibold">Access level</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
              <th className="w-28" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const theirRank = ROLE_RANK[m.role as UserRole] ?? 0;
              const isMe = m.id === myId;
              // You can manage someone only if your rank is strictly higher.
              const canManage = !isMe && myRank > theirRank;
              return (
                <tr
                  key={m.id}
                  className={`border-b border-[#e4e9f1] last:border-0 ${
                    !m.is_active ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-5 py-3.5 font-semibold">
                    {m.full_name || "—"}
                    {isMe && (
                      <span className="ml-2 text-xs text-[#b9700f] font-bold">
                        (you)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[#5a6b85]">{m.email}</td>
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
                          (r) => ROLE_RANK[r] < myRank
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
                  <td className="px-5 py-3.5 text-right">
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

      {inviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-4">
              Add Team Member
            </h2>
            <form action={handleInvite} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Full name
                </label>
                <input
                  name="full_name"
                  required
                  className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0e1726] mb-1">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff8a1e]"
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
                  {STAFF_ROLES.filter((r) => ROLE_RANK[r] < myRank).map((r) => (
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
