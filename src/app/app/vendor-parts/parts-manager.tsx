"use client";

import { useState } from "react";
import { parseSheet } from "@/lib/sheet";
import { savePart, deletePart, importParts, type VendorPartRow } from "./actions";

type Part = {
  id: string;
  vendor: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  brand: string | null;
  unit: string | null;
  cost: number | null;
  sell: string | null;
  url: string | null;
  last_checked: string | null;
};

const HEADER_MAP: Record<string, keyof VendorPartRow> = {
  "vendor": "vendor",
  "supplier": "vendor",
  "sku": "sku",
  "item": "sku",
  "item no": "sku",
  "item number": "sku",
  "item #": "sku",
  "part": "sku",
  "part no": "sku",
  "part number": "sku",
  "part #": "sku",
  "grainger item": "sku",
  "name": "name",
  "product": "name",
  "product name": "name",
  "title": "name",
  "description": "description",
  "product description": "description",
  "category": "category",
  "department": "category",
  "brand": "brand",
  "manufacturer": "brand",
  "make": "brand",
  "unit": "unit",
  "uom": "unit",
  "unit of measure": "unit",
  "cost": "cost",
  "price": "cost",
  "unit price": "cost",
  "unit cost": "cost",
  "your price": "cost",
  "url": "url",
  "link": "url",
  "product url": "url",
};

const inputCls =
  "block mt-1 w-full border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]";
const labelCls = "block text-xs font-semibold text-[#5a6b85]";

export function PartsManager({ parts, markup }: { parts: Part[]; markup: number }) {
  const [edit, setEdit] = useState<Part | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [rows, setRows] = useState<VendorPartRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(fd: FormData) {
    setError(null);
    const res = await savePart(edit === "new" ? null : (edit as Part).id, fd);
    if (res.error) return setError(res.error);
    setEdit(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const parsed = parseSheet<VendorPartRow>(await file.arrayBuffer(), HEADER_MAP);
      const valid = parsed.filter((r) => r.sku && r.name) as VendorPartRow[];
      if (!valid.length) {
        setError("No usable rows — need at least SKU/Part Number and Name columns.");
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
    const defaultVendor =
      (document.getElementById("import-vendor") as HTMLInputElement)?.value.trim() || "";
    const payload = rows.map((r) => ({ ...r, vendor: r.vendor?.trim() || defaultVendor }));
    if (payload.some((r) => !r.vendor)) {
      setSaving(false);
      setError("Some rows have no vendor — enter a default vendor above.");
      return;
    }
    const res = await importParts(payload);
    setSaving(false);
    if (res.error) return setError(res.error);
    setResult(
      `Imported/updated ${res.imported.toLocaleString()} part${res.imported === 1 ? "" : "s"}${res.skipped ? `, skipped ${res.skipped}` : ""}.`
    );
    setRows([]);
    setFileName("");
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setEdit("new")}
          className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2 text-sm transition"
        >
          Add part
        </button>
        <button
          onClick={() => setImportOpen(true)}
          className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] text-[#0e1726] font-semibold rounded-lg px-4 py-2 text-sm transition"
        >
          Import CSV / Excel
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
        {!parts.length ? (
          <div className="p-10 text-center text-[#5a6b85]">
            No parts match. Import a vendor sheet or add parts manually.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1]">
                <th className="px-4 py-3 font-semibold">Part #</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Brand</th>
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold text-right">Cost</th>
                <th className="px-4 py-3 font-semibold text-right">Sell (+{markup}%)</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setEdit(p)}
                  className="border-b border-[#e4e9f1] last:border-0 hover:bg-[#f5f7fb] cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono font-semibold whitespace-nowrap">{p.sku}</td>
                  <td className="px-4 py-3 max-w-md">
                    <div className="truncate">{p.name}</div>
                    {p.description && (
                      <div className="text-xs text-[#5a6b85] truncate">{p.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#5a6b85]">{p.brand ?? "—"}</td>
                  <td className="px-4 py-3 text-[#5a6b85]">{p.vendor}</td>
                  <td className="px-4 py-3 text-right text-[#5a6b85]">
                    {p.cost == null ? <span className="text-xs">no price yet</span> : `$${p.cost.toFixed(2)}`}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#1f9d63]">
                    {p.sell ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-4">
              {edit === "new" ? "Add part" : "Edit part"}
            </h2>
            <form action={submit} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <label className={labelCls}>
                  Vendor *
                  <input name="vendor" required defaultValue={edit === "new" ? "" : edit.vendor} placeholder="Grainger" className={inputCls} />
                </label>
                <label className={labelCls}>
                  Part number *
                  <input name="sku" required defaultValue={edit === "new" ? "" : edit.sku} className={inputCls} />
                </label>
                <label className={labelCls}>
                  Brand
                  <input name="brand" defaultValue={edit === "new" ? "" : edit.brand ?? ""} className={inputCls} />
                </label>
              </div>
              <label className={labelCls}>
                Name *
                <input name="name" required defaultValue={edit === "new" ? "" : edit.name} className={inputCls} />
              </label>
              <label className={labelCls}>
                Description
                <textarea name="description" rows={2} defaultValue={edit === "new" ? "" : edit.description ?? ""} className={inputCls} />
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className={labelCls}>
                  Category
                  <input name="category" defaultValue={edit === "new" ? "" : edit.category ?? ""} className={inputCls} />
                </label>
                <label className={labelCls}>
                  Unit
                  <input name="unit" defaultValue={edit === "new" ? "each" : edit.unit ?? "each"} className={inputCls} />
                </label>
                <label className={labelCls}>
                  Cost ($)
                  <input name="cost" type="number" step="0.01" defaultValue={edit === "new" ? "" : edit.cost ?? ""} className={inputCls} />
                </label>
                <label className={labelCls}>
                  Product URL
                  <input name="url" defaultValue={edit === "new" ? "" : edit.url ?? ""} className={inputCls} />
                </label>
              </div>
              {error && (
                <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2">{error}</div>
              )}
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-2.5 transition">
                  Save part
                </button>
                {edit !== "new" && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Delete this part?")) return;
                      await deletePart(edit.id);
                      setEdit(null);
                    }}
                    className="px-4 py-2.5 border border-[#e4e9f1] rounded-lg font-semibold text-[#d24b4b] hover:border-[#d24b4b]"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setEdit(null); setError(null); }}
                  className="px-5 py-2.5 border border-[#e4e9f1] rounded-lg font-semibold text-[#0e1726] hover:border-[#ff8a1e]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-1">Import parts</h2>
            <p className="text-sm text-[#5a6b85] mb-4">
              Upload a vendor quote sheet, order-history export, or catalog
              extraction (.csv/.xlsx). Recognized columns: Vendor, SKU/Part
              Number/Item, Name, Description, Category, Brand, Unit, Cost/Price,
              URL. Re-importing the same vendor+part updates it (no duplicates).
            </p>
            <label className={labelCls}>
              Default vendor (for files without a vendor column)
              <input id="import-vendor" placeholder="e.g. Grainger" className={inputCls} />
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFile}
              className="w-full text-sm text-[#5a6b85] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#fff2e3] file:text-[#b9700f] file:font-semibold file:cursor-pointer my-4"
            />
            {rows.length > 0 && (
              <div className="bg-[#f5f7fb] rounded-xl p-4 mb-4 text-sm">
                <b>{fileName}</b>: {rows.length.toLocaleString()} parts ready.
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1 text-[#5a6b85]">
                  {rows.slice(0, 6).map((r, i) => (
                    <div key={i}>• {r.sku} · {r.name?.slice(0, 60)}{r.cost ? ` · $${r.cost}` : ""}</div>
                  ))}
                  {rows.length > 6 && <div>…and {(rows.length - 6).toLocaleString()} more</div>}
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
                  {saving ? "Importing…" : `Import ${rows.length.toLocaleString()} parts`}
                </button>
              )}
              <button
                onClick={() => { setImportOpen(false); setRows([]); setError(null); setResult(null); }}
                className="px-5 py-2.5 border border-[#e4e9f1] rounded-lg font-semibold text-[#0e1726] hover:border-[#ff8a1e]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
