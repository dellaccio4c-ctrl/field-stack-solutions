import * as XLSX from "xlsx";

// Normalize a spreadsheet header for matching: lowercase, strip punctuation
// ("City/ Township" -> "city township", "Zip/ Postal Code" -> "zip postal code").
export function normalizeHeader(h: string) {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9#]+/g, " ")
    .trim();
}

// Parse the first sheet into records using a header alias map. Real-world
// exports often have title/banner rows above the data, so the header row is
// detected by scanning the first 10 rows for the one matching the most known
// column names.
export function parseSheet<T>(
  data: ArrayBuffer,
  headerMap: Record<string, keyof T>
): Partial<T>[] {
  const wb = XLSX.read(data, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });
  if (!grid.length) return [];

  let headerIdx = 0;
  let best = 0;
  for (let i = 0; i < Math.min(grid.length, 10); i++) {
    const hits = (grid[i] ?? []).filter(
      (c) => typeof c === "string" && headerMap[normalizeHeader(c)]
    ).length;
    if (hits > best) {
      best = hits;
      headerIdx = i;
    }
  }
  if (best === 0) return [];

  const cols = (grid[headerIdx] ?? []).map((c) =>
    typeof c === "string" ? headerMap[normalizeHeader(c)] : undefined
  );

  const out: Partial<T>[] = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const cells = grid[i] ?? [];
    const row: Partial<T> = {};
    let hasValue = false;
    cells.forEach((value, c) => {
      const key = cols[c];
      if (!key) return;
      const str =
        value instanceof Date
          ? value.toISOString().slice(0, 10)
          : String(value ?? "").trim();
      if (str && str.toUpperCase() !== "N/A") {
        (row[key] as unknown) = str;
        hasValue = true;
      }
    });
    if (hasValue) out.push(row);
  }
  return out;
}
