import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "../../back-link";
import { EntryForm } from "./entry-form";
import { EntriesTable } from "./entries-table";
import { ImportEntriesModal } from "./import-entries-modal";
import type { FormField } from "../actions";

export default async function ReportFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: form } = await supabase
    .from("ops_forms")
    .select("id, name, department, cadence, due_note, description, fields")
    .eq("id", id)
    .single();
  if (!form) notFound();

  const [{ data: entries }, { data: locations }, { data: me }] =
    await Promise.all([
      supabase
        .from("ops_entries")
        .select("id, entry_date, data, created_at, locations(label), profiles:submitted_by(full_name, preferred_name)")
        .eq("form_id", id)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("locations").select("id, label").order("label"),
      (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        return supabase.from("profiles").select("role").eq("id", user!.id).single();
      })(),
    ]);

  const fields = (form.fields as FormField[]) ?? [];
  const canManage = ["manager", "admin", "owner"].includes(me?.data?.role ?? "");

  const rows = (entries ?? []).map((e) => ({
    id: e.id,
    entry_date: e.entry_date,
    created_at: e.created_at,
    site:
      (e.locations as unknown as { label: string } | null)?.label ?? null,
    submitter: (() => {
      const p = e.profiles as unknown as {
        full_name: string | null;
        preferred_name: string | null;
      } | null;
      return p?.preferred_name || p?.full_name?.split(" ")[0] || "—";
    })(),
    data: e.data as Record<string, unknown>,
  }));

  return (
    <div>
      <BackLink fallback="/app/reports" label="Back to Reports" />
      <div className="flex items-start justify-between flex-wrap gap-3 mb-1 mt-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
          {form.name}
        </h1>
        <div className="flex items-center gap-2">
          {canManage && <ImportEntriesModal formId={form.id} fields={fields} />}
          <a
            href={`/app/reports/${form.id}/export`}
            className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] text-[#0e1726] font-semibold rounded-lg px-4 py-2 text-sm transition"
          >
            Export CSV
          </a>
        </div>
      </div>
      {form.due_note && (
        <p className="text-sm font-semibold text-[#b9700f] mb-1">{form.due_note}</p>
      )}
      {form.description && <p className="text-[#5a6b85] mb-6">{form.description}</p>}
      {!form.description && <div className="mb-6" />}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-extrabold text-[#0e1726] mb-3">New entry</h2>
          <EntryForm
            formId={form.id}
            fields={fields}
            locations={locations ?? []}
          />
        </div>
        <div className="lg:col-span-3">
          <h2 className="text-lg font-extrabold text-[#0e1726] mb-3">
            Entries{" "}
            <span className="text-sm font-semibold text-[#5a6b85]">
              (latest {rows.length})
            </span>
          </h2>
          <EntriesTable
            formId={form.id}
            fields={fields}
            rows={rows}
            canManage={canManage}
          />
        </div>
      </div>
    </div>
  );
}
