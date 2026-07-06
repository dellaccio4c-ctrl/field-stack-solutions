import { createClient } from "@/lib/supabase/server";
import type { FormField } from "../../actions";

function csvCell(v: unknown) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: form } = await supabase
    .from("ops_forms")
    .select("name, fields")
    .eq("id", id)
    .single();
  if (!form) return new Response("Not found", { status: 404 });

  const { data: entries } = await supabase
    .from("ops_entries")
    .select("entry_date, data, created_at, locations(label), profiles:submitted_by(full_name)")
    .eq("form_id", id)
    .order("entry_date", { ascending: false });

  const fields = (form.fields as FormField[]) ?? [];
  const header = ["Date", "Site", "Submitted By", ...fields.map((f) => f.label)];
  const lines = [header.map(csvCell).join(",")];
  for (const e of entries ?? []) {
    const data = (e.data ?? {}) as Record<string, unknown>;
    lines.push(
      [
        e.entry_date,
        (e.locations as unknown as { label: string } | null)?.label ?? "",
        (e.profiles as unknown as { full_name: string | null } | null)?.full_name ?? "",
        ...fields.map((f) => data[f.key]),
      ]
        .map(csvCell)
        .join(",")
    );
  }

  const filename = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-entries.csv";
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
