// Sales-system connectors. Each provider maps its API's sales/transaction
// feed into a common shape; new systems only need an entry here.

export type SaleRecord = {
  external_id: string;
  occurred_on: string; // YYYY-MM-DD
  description: string | null;
  category: string | null;
  amount: number;
  raw: unknown;
};

export type ProviderKey = "sonnys_controls" | "nxt" | "storage360" | "custom";

type ProviderDef = {
  label: string;
  // Endpoint path appended to the base URL; {since} is replaced with YYYY-MM-DD.
  salesPath: string;
  authHeader: (apiKey: string) => Record<string, string>;
  // Pull the array of records out of the response body.
  extract: (body: unknown) => unknown[];
  // Map one raw record to the common shape; return null to skip.
  map: (r: Record<string, unknown>) => SaleRecord | null;
};

const asStr = (v: unknown) => (v == null ? null : String(v));
const asNum = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/[$,]/g, ""));
  return isNaN(n) ? null : n;
};
const asDate = (v: unknown) => {
  const d = new Date(String(v ?? ""));
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

// Generic mapper: tolerates the field names these systems commonly use.
function genericMap(r: Record<string, unknown>): SaleRecord | null {
  const id = asStr(r.id ?? r.transaction_id ?? r.transactionId ?? r.sale_id ?? r.invoice_id ?? r.number);
  const date = asDate(r.date ?? r.occurred_on ?? r.transaction_date ?? r.created_at ?? r.createdAt ?? r.timestamp);
  const amount = asNum(r.amount ?? r.total ?? r.gross ?? r.grand_total ?? r.price);
  if (!id || !date || amount == null) return null;
  return {
    external_id: id,
    occurred_on: date,
    description: asStr(r.description ?? r.memo ?? r.item ?? r.wash_name ?? r.service ?? r.type),
    category: asStr(r.category ?? r.department ?? r.wash_package ?? r.product_type),
    amount,
    raw: r,
  };
}

export const PROVIDERS: Record<ProviderKey, ProviderDef> = {
  sonnys_controls: {
    label: "Sonny's Controls (POS)",
    salesPath: "/api/v1/transactions?startDate={since}",
    authHeader: (k) => ({ Authorization: `Bearer ${k}` }),
    extract: (b) =>
      Array.isArray(b)
        ? b
        : ((b as Record<string, unknown>)?.transactions as unknown[]) ??
          ((b as Record<string, unknown>)?.data as unknown[]) ??
          [],
    map: genericMap,
  },
  nxt: {
    label: "NXT",
    salesPath: "/api/sales?from={since}",
    authHeader: (k) => ({ "X-Api-Key": k }),
    extract: (b) =>
      Array.isArray(b)
        ? b
        : ((b as Record<string, unknown>)?.sales as unknown[]) ??
          ((b as Record<string, unknown>)?.data as unknown[]) ??
          [],
    map: genericMap,
  },
  storage360: {
    label: "Storage 360",
    salesPath: "/api/v1/payments?since={since}",
    authHeader: (k) => ({ Authorization: `Bearer ${k}` }),
    extract: (b) =>
      Array.isArray(b)
        ? b
        : ((b as Record<string, unknown>)?.payments as unknown[]) ??
          ((b as Record<string, unknown>)?.results as unknown[]) ??
          [],
    map: genericMap,
  },
  custom: {
    label: "Custom REST (JSON)",
    salesPath: "?since={since}",
    authHeader: (k) =>
      k ? { Authorization: `Bearer ${k}` } : ({} as Record<string, string>),
    extract: (b) =>
      Array.isArray(b)
        ? b
        : ((b as Record<string, unknown>)?.data as unknown[]) ?? [],
    map: genericMap,
  },
};

export async function fetchProviderSales(
  provider: ProviderKey,
  baseUrl: string,
  apiKey: string,
  since: string
): Promise<{ records: SaleRecord[]; error: string | null }> {
  const def = PROVIDERS[provider];
  const url =
    baseUrl.replace(/\/+$/, "") + def.salesPath.replace("{since}", since);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...def.authHeader(apiKey) },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok)
      return { records: [], error: `${def.label} responded ${res.status} ${res.statusText}` };
    const body = await res.json();
    const rows = def.extract(body);
    const records = rows
      .map((r) => def.map(r as Record<string, unknown>))
      .filter((r): r is SaleRecord => r !== null);
    if (rows.length > 0 && records.length === 0)
      return {
        records: [],
        error:
          "Connected, but no records matched the expected fields (need an id, date, and amount per record).",
      };
    return { records, error: null };
  } catch (e) {
    return {
      records: [],
      error: e instanceof Error ? e.message : "Connection failed",
    };
  }
}
