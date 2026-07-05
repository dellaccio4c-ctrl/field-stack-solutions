export function money(n: number | string | null | undefined) {
  const v = typeof n === "string" ? parseFloat(n) : n ?? 0;
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
};

export function subtotal(items: Pick<LineItem, "quantity" | "unit_price">[]) {
  return items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
}
