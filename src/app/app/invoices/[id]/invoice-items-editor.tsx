"use client";

import { useRef, useState } from "react";
import { addInvoiceItem, deleteInvoiceItem } from "../actions";
import { money } from "@/lib/money";

type Item = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
};

type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
  unit_price: number;
};

export function InvoiceItemsEditor({
  invoiceId,
  items,
  editable,
  catalog = [],
}: {
  invoiceId: string;
  items: Item[];
  editable: boolean;
  catalog?: CatalogItem[];
}) {
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAdd(formData: FormData) {
    setError(null);
    const result = await addInvoiceItem(invoiceId, formData);
    if (result.error) setError(result.error);
    else formRef.current?.reset();
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1] bg-[#f5f7fb]">
            <th className="px-5 py-3 font-semibold">Description</th>
            <th className="px-5 py-3 font-semibold w-24 text-right">Qty</th>
            <th className="px-5 py-3 font-semibold w-32 text-right">Unit price</th>
            <th className="px-5 py-3 font-semibold w-32 text-right">Amount</th>
            {editable && <th className="w-14" />}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td
                colSpan={editable ? 5 : 4}
                className="px-5 py-6 text-center text-[#5a6b85]"
              >
                No line items{editable ? " — add one below" : ""}.
              </td>
            </tr>
          )}
          {items.map((it) => (
            <tr key={it.id} className="border-b border-[#e4e9f1] last:border-0">
              <td className="px-5 py-3">{it.description}</td>
              <td className="px-5 py-3 text-right">{Number(it.quantity)}</td>
              <td className="px-5 py-3 text-right">{money(it.unit_price)}</td>
              <td className="px-5 py-3 text-right font-semibold">
                {money(Number(it.quantity) * Number(it.unit_price))}
              </td>
              {editable && (
                <td className="px-3 py-3 text-right">
                  <button
                    onClick={() => deleteInvoiceItem(invoiceId, it.id)}
                    className="text-[#d24b4b] hover:bg-[#fbe7e7] rounded-lg px-2 py-1"
                    title="Remove"
                  >
                    ✕
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {editable && (
        <form
          ref={formRef}
          action={handleAdd}
          className="flex gap-3 items-end p-4 border-t border-[#e4e9f1] bg-[#f5f7fb] flex-wrap"
        >
          {catalog.length > 0 && (
            <div className="w-full">
              <label className="block text-xs font-semibold text-[#5a6b85] mb-1">
                Add from catalog
              </label>
              <select
                defaultValue=""
                onChange={(e) => {
                  const it = catalog.find((c) => c.id === e.target.value);
                  if (!it) return;
                  const f = e.currentTarget.form!;
                  (f.elements.namedItem("description") as HTMLInputElement).value =
                    it.description ? `${it.name} — ${it.description}` : it.name;
                  (f.elements.namedItem("unit_price") as HTMLInputElement).value =
                    String(Number(it.unit_price));
                  e.currentTarget.value = "";
                }}
                className="w-full max-w-md border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
              >
                <option value="">Pick a saved service…</option>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {money(c.unit_price)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-semibold text-[#5a6b85] mb-1">
              Description
            </label>
            <input
              name="description"
              required
              className="w-full border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5a6b85] mb-1">
              Qty
            </label>
            <input
              name="quantity"
              type="number"
              step="0.01"
              min="0"
              defaultValue="1"
              className="w-20 border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5a6b85] mb-1">
              Unit price
            </label>
            <input
              name="unit_price"
              type="number"
              step="0.01"
              min="0"
              required
              className="w-28 border border-[#e4e9f1] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#ff8a1e]"
            />
          </div>
          <button
            type="submit"
            className="bg-[#0e1f38] hover:bg-[#15294a] text-white font-semibold rounded-lg px-4 py-2 transition"
          >
            Add item
          </button>
          {error && <div className="text-sm text-[#d24b4b] w-full">{error}</div>}
        </form>
      )}
    </div>
  );
}
