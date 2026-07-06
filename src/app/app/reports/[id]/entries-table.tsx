"use client";

import { useState } from "react";
import { deleteEntry, type FormField } from "../actions";

type Row = {
  id: string;
  entry_date: string;
  created_at: string;
  site: string | null;
  submitter: string;
  data: Record<string, unknown>;
};

function cell(v: unknown) {
  if (v === true) return "✓";
  if (v === false || v == null || v === "") return "—";
  return String(v);
}

export function EntriesTable({
  formId,
  fields,
  rows,
  canManage,
}: {
  formId: string;
  fields: FormField[];
  rows: Row[];
  canManage: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  // Keep the table scannable: first 4 fields inline, rest in the expander.
  const cols = fields.slice(0, 4);

  if (!rows.length)
    return (
      <div className="bg-white rounded-2xl border border-[#e4e9f1] p-10 text-center text-[#5a6b85]">
        No entries yet — the first submission will appear here.
      </div>
    );

  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1]">
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Site</th>
            <th className="px-4 py-3 font-semibold">By</th>
            {cols.map((f) => (
              <th key={f.key} className="px-4 py-3 font-semibold">
                {f.label.length > 22 ? f.label.slice(0, 20) + "…" : f.label}
              </th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <>
              <tr
                key={r.id}
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                className="border-b border-[#e4e9f1] last:border-0 hover:bg-[#f5f7fb] cursor-pointer"
              >
                <td className="px-4 py-3 whitespace-nowrap">{r.entry_date}</td>
                <td className="px-4 py-3">{r.site ?? "—"}</td>
                <td className="px-4 py-3 text-[#5a6b85]">{r.submitter}</td>
                {cols.map((f) => (
                  <td key={f.key} className="px-4 py-3 text-[#5a6b85] max-w-40 truncate">
                    {cell(r.data[f.key])}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-[#5a6b85]">
                  {expanded === r.id ? "▴" : "▾"}
                </td>
              </tr>
              {expanded === r.id && (
                <tr key={`${r.id}-x`} className="border-b border-[#e4e9f1] bg-[#f9fafc]">
                  <td colSpan={cols.length + 4} className="px-5 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      {fields.map((f) => (
                        <div key={f.key}>
                          <span className="font-semibold text-[#0e1726]">{f.label}:</span>{" "}
                          <span className="text-[#5a6b85] whitespace-pre-wrap">
                            {cell(r.data[f.key])}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-3 text-xs text-[#5a6b85]">
                      <span>Submitted {new Date(r.created_at).toLocaleString()}</span>
                      {canManage && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm("Delete this entry?")) return;
                            await deleteEntry(formId, r.id);
                          }}
                          className="text-[#d24b4b] font-semibold hover:underline"
                        >
                          Delete entry
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
