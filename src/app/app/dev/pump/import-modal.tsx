"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { importPumpSites } from "./actions";

type ParsedRow = {
  client_name: string;
  site_label?: string;
  address: string;
  interval_months?: number;
  window_days?: number;
  last_pumped?: string;
  notes?: string;
};

const HEADER_MAP: Record<string, keyof ParsedRow> = {
  "client": "client_name",
  "client name": "client_name",
  "customer": "client_name",
  "company": "client_name",
  "name": "client_name",
  "site": "site_label",
  "site label": "site_label",
  "location": "site_label",
  "address": "address",
  "site address": "address",
  "interval": "interval_months",
  "interval months": "interval_months",
  "interval_months": "interval_months",
  "months": "interval_months",
  "window": "window_days",
  "window days": "window_days",
  "window_days": "window_days",
  "last pumped": "last_pumped",
  "last_pumped": "last_pumped",
  "last service": "last_pumped",
  "notes": "notes",
  "note": "notes",
  "comments": "notes",
};

export function ImportModal() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function downloadTemplate() {
    const csv =
      "Client Name,Site Label,Address,Interval Months,Window Days,Last Pumped,Notes\r\n" +
      'Acme Car Wash,Main St,"123 Main St, Birmingham, AL 35203",6,14,2026-05-01,Gate code 4482\r\n';
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pump-sites-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });

      const parsed: ParsedRow[] = raw.map((r) => {
        const row: Partial<ParsedRow> = {};
        for (const [key, value] of Object.entries(r)) {
          const mapped = HEADER_MAP[key.trim().toLowerCase()];
          if (!mapped) continue;
          if (value instanceof Date) {
            (row[mapped] as unknown) = value.toISOString().slice(0, 10);
          } else {
            (row[mapped] as unknown) = String(value).trim();
          }
        }
        return row as ParsedRow;
      });

      const valid = parsed.filter((r) => r.client_name && r.address);
      if (!valid.length) {
        setError(
          "No usable rows found. The file needs at least 'Client Name' and 'Address' columns — download the template to see the expected format."
        );
        setRows([]);
        return;
      }
      setRows(valid);
    } catch {
      setError("Couldn't read that file. Use .csv or .xlsx format.");
      setRows([]);
    }
  }

  async function handleImport() {
    setSaving(true);
    setError(null);
    const res = await importPumpSites(rows);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setResult(
      `Imported ${res.imported} site${res.imported === 1 ? "" : "s"}. Use "Locate map pins" to place them on the map.`
    );
    setRows([]);
    setFileName("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] text-[#0e1726] font-semibold rounded-lg px-4 py-2 text-sm transition"
      >
        Import CSV / Excel
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-1">
              Import Sites
            </h2>
            <p className="text-sm text-[#5a6b85] mb-4">
              Upload a .csv or .xlsx file with columns: Client Name, Site Label,
              Address, Interval Months, Window Days, Last Pumped, Notes. Only
              Client Name and Address are required.{" "}
              <button
                onClick={downloadTemplate}
                className="text-[#b9700f] font-semibold underline"
              >
                Download template
              </button>
            </p>

            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFile}
              className="w-full text-sm text-[#5a6b85] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#fff2e3] file:text-[#b9700f] file:font-semibold file:cursor-pointer mb-4"
            />

            {rows.length > 0 && (
              <div className="bg-[#f5f7fb] rounded-xl p-4 mb-4 text-sm">
                <b>{fileName}</b>: {rows.length} site
                {rows.length === 1 ? "" : "s"} ready to import.
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {rows.slice(0, 8).map((r, i) => (
                    <div key={i} className="text-[#5a6b85]">
                      • {r.client_name}
                      {r.site_label ? ` — ${r.site_label}` : ""} ·{" "}
                      {r.address}
                    </div>
                  ))}
                  {rows.length > 8 && (
                    <div className="text-[#5a6b85]">
                      …and {rows.length - 8} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2 mb-3">
                {error}
              </div>
            )}
            {result && (
              <div className="text-sm text-[#1f9d63] bg-[#e3f6ec] rounded-lg px-3 py-2 mb-3">
                {result}
              </div>
            )}

            <div className="flex gap-3">
              {rows.length > 0 && (
                <button
                  onClick={handleImport}
                  disabled={saving}
                  className="flex-1 bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
                >
                  {saving ? "Importing…" : `Import ${rows.length} sites`}
                </button>
              )}
              <button
                onClick={() => {
                  setOpen(false);
                  setRows([]);
                  setError(null);
                  setResult(null);
                }}
                className="px-5 py-2.5 border border-[#e4e9f1] rounded-lg font-semibold text-[#0e1726] hover:border-[#ff8a1e]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
