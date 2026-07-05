"use client";

import { useState } from "react";
import { setLeadStatus } from "./actions";

type Lead = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  service: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  new: "bg-[#fff2e3] text-[#b9700f]",
  contacted: "bg-[#e8f0fd] text-[#2f6fd6]",
  converted: "bg-[#e3f6ec] text-[#1f9d63]",
  closed: "bg-[#eef1f6] text-[#5a6b85]",
};

export function LeadRow({ lead }: { lead: Lead }) {
  const [error, setError] = useState<string | null>(null);

  async function handleStatus(status: string) {
    setError(null);
    const result = await setLeadStatus(lead.id, status);
    if (result.error) setError(result.error);
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] p-5 shadow-sm">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-[#0e1726]">{lead.full_name}</span>
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                STATUS_STYLE[lead.status] ?? STATUS_STYLE.new
              }`}
            >
              {lead.status}
            </span>
            {lead.service && (
              <span className="text-xs font-semibold text-[#5a6b85] bg-[#f5f7fb] rounded-full px-2.5 py-0.5">
                {lead.service}
              </span>
            )}
          </div>
          <div className="text-sm text-[#5a6b85] mt-1 space-x-4">
            <a href={`tel:${lead.phone}`} className="hover:text-[#b9700f]">
              📞 {lead.phone}
            </a>
            <a href={`mailto:${lead.email}`} className="hover:text-[#b9700f]">
              ✉️ {lead.email}
            </a>
            <span>
              {new Date(lead.created_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
        </div>
        <select
          value={lead.status}
          onChange={(e) => handleStatus(e.target.value)}
          className="border border-[#e4e9f1] rounded-lg px-3 py-1.5 bg-white text-sm font-semibold focus:outline-none focus:border-[#ff8a1e]"
        >
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="converted">Converted</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      {lead.message && (
        <p className="text-sm text-[#0e1726] mt-3 bg-[#f5f7fb] rounded-xl p-3">
          {lead.message}
        </p>
      )}
      {error && <div className="text-sm text-[#d24b4b] mt-2">{error}</div>}
    </div>
  );
}
