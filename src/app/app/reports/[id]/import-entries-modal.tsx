"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { normalizeHeader } from "@/lib/sheet";
import { importEntries, type FormField } from "../actions";

type ParsedRow = { site?: string; date?: string; values: Record<string, unknown> };

export function ImportEntriesModal({
  formId,
  fields,
}: {
  formId: string;
  fields: FormField[];
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    try {
      const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const grid = XLSX.utils.sheet_to_json<unknown[]>(
        wb.Sheets[wb.SheetNames[0]],
        { header: 1, defval: "" }
      );
      if (!grid.length) throw new Error("empty");

      // Map columns: Date, Site, plus each form field by its label or key.
      const fieldByHeader = new Map<string, FormField>();
      for (const f of fields) {
        fieldByHeader.set(normalizeHeader(f.label), f);
        fieldByHeader.set(normalizeHeader(f.key), f);
      }

      let headerIdx = 0;
      let best = 0;
      for (let i = 0; i < Math.min(grid.length, 10); i++) {
        const hits = (grid[i] ?? []).filter((c) => {
          if (typeof c !== "string") return false;
          const n = normalizeHeader(c);
          return n === "date" || n === "site" || n === "location" || fieldByHeader.has(n);
        }).length;
        if (hits > best) {
          best = hits;
          headerIdx = i;
        }
      }
      if (best === 0) {
        setError(
          "No recognizable columns. Use a 'Date' column, optional 'Site', and columns matching the form's field labels (an Export CSV from this page is the exact template)."
        );
        setRows([]);
        return;
      }

      const cols = (grid[headerIdx] ?? []).map((c) => {
        if (typeof c !== "string") return null;
        const n = normalizeHeader(c);
        if (n === "date" || n === "entry date") return { kind: "date" as const };
        if (n === "site" || n === "location" || n === "site label")
          return { kind: "site" as const };
        const f = fieldByHeader.get(n);
        return f ? { kind: "field" as const, field: f } : null;
      });

      const parsed: ParsedRow[] = [];
      for (let i = headerIdx + 1; i < grid.length; i++) {
        const cells = grid[i] ?? [];
        const row: ParsedRow = { values: {} };
        let has = false;
        cells.forEach((v, c) => {
          const col = cols[c];
          if (!col) return;
          const s =
            v instanceof Date
              ? v.toISOString().slice(0, 10)
              : String(v ?? "").trim();
          if (!s) return;
          has = true;
          if (col.kind === "date") row.date = s;
          else if (col.kind === "site") row.site = s;
          else if (col.kind === "field") {
            if (col.field.type === "checkbox")
              row.values[col.field.key] = /^(yes|y|true|✓|x|1|on)$/i.test(s);
            else if (col.field.type === "number") {
              const n = parseFloat(s.replace(/[$,]/g, ""));
              row.values[col.field.key] = isNaN(n) ? null : n;
            } else row.values[col.field.key] = s;
          }
        });
        if (has && row.date) parsed.push(row);
      }

      if (!parsed.length) {
        setError("No usable rows found — every entry needs at least a Date.");
        setRows([]);
        return;
      }
      setRows(parsed);
    } catch {
      setError("Couldn't read that file. Use .csv or .xlsx format.");
      setRows([]);
    }
  }

  async function handleImport() {
    setSaving(true);
    setError(null);
    const res = await importEntries(formId, rows);
    setSaving(false);
    if (res.error) return setError(res.error);
    setResult(
      `Imported ${res.imported} entr${res.imported === 1 ? "y" : "ies"}${
        res.skipped ? `, skipped ${res.skipped} without a valid date` : ""
      }.`
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
              Import entries
            </h2>
            <p className="text-sm text-[#5a6b85] mb-4">
              Bring in historical submissions from another system. Columns:
              Date (required), Site (matched by name), plus columns named after
              this form&apos;s fields. The Export CSV from this page is the
              exact template.
            </p>

            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFile}
              className="w-full text-sm text-[#5a6b85] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#fff2e3] file:text-[#b9700f] file:font-semibold file:cursor-pointer mb-4"
            />

            {rows.length > 0 && (
              <div className="bg-[#f5f7fb] rounded-xl p-4 mb-4 text-sm">
                <b>{fileName}</b>: {rows.length} entr{rows.length === 1 ? "y" : "ies"} ready.
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1 text-[#5a6b85]">
                  {rows.slice(0, 6).map((r, i) => (
                    <div key={i}>
                      • {r.date}
                      {r.site ? ` · ${r.site}` : ""} ·{" "}
                      {Object.keys(r.values).length} fields
                    </div>
                  ))}
                  {rows.length > 6 && <div>…and {rows.length - 6} more</div>}
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2 mb-3">{error}</div>
            )}
            {result && (
              <div className="text-sm text-[#1f9d63] bg-[#e3f6ec] rounded-lg px-3 py-2 mb-3">{result}</div>
            )}

            <div className="flex gap-3">
              {rows.length > 0 && (
                <button
                  onClick={handleImport}
                  disabled={saving}
                  className="flex-1 bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
                >
                  {saving ? "Importing…" : `Import ${rows.length} entries`}
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
