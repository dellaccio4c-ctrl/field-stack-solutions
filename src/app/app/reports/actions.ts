"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "checkbox" | "date" | "select";
  options?: string[];
  required?: boolean;
};

export async function submitEntry(formId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: form } = await supabase
    .from("ops_forms")
    .select("name, fields")
    .eq("id", formId)
    .single();
  if (!form) return { error: "Form not found." };

  const data: Record<string, unknown> = {};
  for (const f of (form.fields as FormField[]) ?? []) {
    const raw = formData.get(`f_${f.key}`);
    if (f.type === "checkbox") data[f.key] = raw === "on";
    else if (f.type === "number") {
      const n = parseFloat(String(raw ?? ""));
      data[f.key] = isNaN(n) ? null : n;
    } else {
      const s = String(raw ?? "").trim();
      if (f.required && !s) return { error: `"${f.label}" is required.` };
      data[f.key] = s || null;
    }
  }

  const { error } = await supabase.from("ops_entries").insert({
    form_id: formId,
    location_id: String(formData.get("location_id") ?? "").trim() || null,
    submitted_by: user.id,
    entry_date:
      String(formData.get("entry_date") ?? "").trim() ||
      new Date().toISOString().slice(0, 10),
    data,
  });
  if (error) return { error: error.message };

  // Alert opted-in staff on the event-driven reports that demand eyes now.
  const alertKey = /closure/i.test(form.name)
    ? "site_closures"
    : /incident/i.test(form.name)
      ? "incident_claims"
      : null;
  if (alertKey) {
    try {
      const { emailConfigured, sendAlertEmail } = await import("@/lib/email");
      if (emailConfigured()) {
        const [{ data: staff }, { data: site }] = await Promise.all([
          supabase
            .from("profiles")
            .select("email, notify_prefs")
            .neq("role", "customer")
            .eq("is_active", true),
          formData.get("location_id")
            ? supabase
                .from("locations")
                .select("label")
                .eq("id", String(formData.get("location_id")))
                .single()
            : Promise.resolve({ data: null }),
        ]);
        const to = (staff ?? [])
          .filter(
            (p) =>
              (p.notify_prefs as Record<string, boolean>)?.[alertKey] && p.email
          )
          .map((p) => p.email as string);
        if (to.length) {
          const siteLabel = (site as { label: string } | null)?.label;
          await sendAlertEmail({
            to,
            subject: `${form.name}${siteLabel ? ` — ${siteLabel}` : ""}`,
            bodyHtml: `<p><b>${form.name}</b> was just submitted${siteLabel ? ` for <b>${siteLabel}</b>` : ""}.</p>`,
            link: `https://www.fieldstacksolutions.com/app/reports/${formId}`,
          });
        }
      }
    } catch {
      // Alerting is best-effort; the entry itself is already saved.
    }
  }

  revalidatePath(`/app/reports/${formId}`);
  revalidatePath("/app/reports");
  return { error: null };
}

export async function deleteEntry(formId: string, entryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ops_entries").delete().eq("id", entryId);
  if (error) return { error: error.message };
  revalidatePath(`/app/reports/${formId}`);
  return { error: null };
}

// Bulk import of historical entries (e.g. exported from another system).
// Rows carry a site name (matched by label), a date, and per-field columns.
export async function importEntries(
  formId: string,
  rows: { site?: string; date?: string; values: Record<string, unknown> }[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", imported: 0, skipped: 0 };
  if (rows.length > 2000)
    return { error: "Over 2,000 rows — split the file.", imported: 0, skipped: 0 };

  const { data: locations } = await supabase
    .from("locations")
    .select("id, label");
  const byLabel = new Map(
    (locations ?? []).map((l) => [l.label.trim().toLowerCase(), l.id])
  );

  let imported = 0;
  let skipped = 0;
  const inserts = [];
  for (const row of rows) {
    const d = row.date ? new Date(row.date) : null;
    if (!d || isNaN(d.getTime())) {
      skipped++;
      continue;
    }
    inserts.push({
      form_id: formId,
      location_id: row.site
        ? byLabel.get(row.site.trim().toLowerCase()) ?? null
        : null,
      submitted_by: user.id,
      entry_date: d.toISOString().slice(0, 10),
      data: row.values,
    });
  }
  for (let i = 0; i < inserts.length; i += 500) {
    const { error } = await supabase
      .from("ops_entries")
      .insert(inserts.slice(i, i + 500));
    if (error) return { error: error.message, imported, skipped };
    imported += Math.min(500, inserts.length - i);
  }

  revalidatePath(`/app/reports/${formId}`);
  revalidatePath("/app/reports");
  return { error: null, imported, skipped };
}
