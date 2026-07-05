"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { importEquipment, type ImportEquipmentRow } from "./import-actions";

const HEADER_MAP: Record<string, keyof ImportEquipmentRow> = {
  "customer": "customer_name",
  "customer name": "customer_name",
  "client": "customer_name",
  "client name": "customer_name",
  "company": "customer_name",
  "site": "site_label",
  "site label": "site_label",
  "site name": "site_label",
  "location": "site_label",
  "location name": "site_label",
  "equipment": "name",
  "equipment name": "name",
  "name": "name",
  "unit name": "name",
  "description": "name",
  "category": "category",
  "type": "category",
  "equipment type": "category",
  "brand": "brand",
  "make": "brand",
  "manufacturer": "brand",
  "model": "model",
  "model number": "model",
  "serial": "serial_number",
  "serial number": "serial_number",
  "serial #": "serial_number",
  "sn": "serial_number",
  "unit": "unit_number",
  "unit number": "unit_number",
  "unit #": "unit_number",
  "install date": "install_date",
  "installed": "install_date",
  "installation date": "install_date",
  "in service": "install_date",
  "warranty": "warranty_expires",
  "warranty expires": "warranty_expires",
  "warranty expiration": "warranty_expires",
  "pm interval": "pm_interval_months",
  "pm interval months": "pm_interval_months",
  "pm months": "pm_interval_months",
  "pm window": "pm_window_days",
  "pm window days": "pm_window_days",
  "notes": "notes",
  "note": "notes",
  "comments": "notes",
};

export function ImportEquipmentModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ImportEquipmentRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function downloadTemplate() {
    const csv =
      "Customer Name,Site Label,Equipment Name,Category,Brand,Model,Serial Number,Unit Number,Install Date,Warranty Expires,PM Interval Months,PM Window Days,Notes\r\n" +
      "Acme Car Wash,Downtown,Vacuum pump — Bay 2,pump,Grundfos,CR-45,SN-88213,U-102,2024-03-15,2027-03-15,6,14,Belt replaced 2026-01\r\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "equipment-template.csv";
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

      const parsed: ImportEquipmentRow[] = raw.map((r) => {
        const row: Partial<ImportEquipmentRow> = {};
        for (const [key, value] of Object.entries(r)) {
          const mapped = HEADER_MAP[key.trim().toLowerCase()];
          if (!mapped) continue;
          (row[mapped] as unknown) =
            value instanceof Date
              ? value.toISOString().slice(0, 10)
              : String(value).trim();
        }
        return row as ImportEquipmentRow;
      });

      const valid = parsed.filter((r) => r.customer_name && r.name);
      if (!valid.length) {
        setError(
          "No usable rows found. The file needs at least 'Customer Name' and 'Equipment Name' columns — download the template to see the expected format."
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
    const res = await importEquipment(rows);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    const parts = [
      `Imported ${res.imported} unit${res.imported === 1 ? "" : "s"}`,
      res.newCustomers > 0
        ? `created ${res.newCustomers} new customer${res.newCustomers === 1 ? "" : "s"}`
        : null,
      res.skipped > 0 ? `skipped ${res.skipped} duplicate/incomplete` : null,
      res.unmatchedSites > 0
        ? `${res.unmatchedSites} had a site name that didn't match an existing site (imported without a site — assign one from the unit's page)`
        : null,
    ].filter(Boolean);
    setResult(`${parts.join(", ")}.`);
    setRows([]);
    setFileName("");
    router.refresh();
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
              Import Equipment
            </h2>
            <p className="text-sm text-[#5a6b85] mb-4">
              Upload a .csv or .xlsx file. Columns: Customer Name, Site Label,
              Equipment Name, Category, Brand, Model, Serial Number, Unit
              Number, Install Date, Warranty Expires, PM Interval Months, PM
              Window Days, Notes. Only Customer Name and Equipment Name are
              required — customers are created when missing, sites are matched
              by name, and duplicate serial numbers are skipped.{" "}
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
                <b>{fileName}</b>: {rows.length} unit
                {rows.length === 1 ? "" : "s"} ready to import.
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {rows.slice(0, 8).map((r, i) => (
                    <div key={i} className="text-[#5a6b85]">
                      • {r.customer_name}
                      {r.site_label ? ` — ${r.site_label}` : ""} · {r.name}
                      {r.serial_number ? ` · SN ${r.serial_number}` : ""}
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
                  {saving
                    ? "Importing…"
                    : `Import ${rows.length} unit${rows.length === 1 ? "" : "s"}`}
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
