import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const CADENCE_ORDER = ["daily", "weekly", "monthly", "quarterly", "semi_annual", "annual", "event"] as const;
const CADENCE_LABEL: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-Annual",
  annual: "Annual",
  event: "As Needed",
};

export default async function ReportsPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const [{ data: forms }, { data: entries }] = await Promise.all([
    supabase
      .from("ops_forms")
      .select("id, name, department, cadence, due_note, description")
      .eq("is_active", true)
      .order("created_at"),
    supabase
      .from("ops_entries")
      .select("id, form_id, entry_date, location_id, created_at"),
  ]);

  const byForm = new Map<string, { total: number; today: number; week: number; last: string | null }>();
  let entriesToday = 0;
  let entriesWeek = 0;
  const sitesToday = new Set<string>();
  for (const e of entries ?? []) {
    const s = byForm.get(e.form_id) ?? { total: 0, today: 0, week: 0, last: null };
    s.total++;
    if (e.entry_date === today) {
      s.today++;
      entriesToday++;
      if (e.location_id) sitesToday.add(e.location_id);
    }
    if (e.entry_date >= weekAgo) {
      s.week++;
      entriesWeek++;
    }
    if (!s.last || e.entry_date > s.last) s.last = e.entry_date;
    byForm.set(e.form_id, s);
  }

  const closureForm = (forms ?? []).find((f) => f.cadence === "event" && /closure/i.test(f.name));
  const closuresWeek = closureForm ? (byForm.get(closureForm.id)?.week ?? 0) : 0;

  const groups = CADENCE_ORDER.map((c) => ({
    cadence: c,
    forms: (forms ?? []).filter((f) => f.cadence === c),
  })).filter((g) => g.forms.length);

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726] mb-2">
        Reports
      </h1>
      <p className="text-[#5a6b85] mb-6">
        Operational reporting — daily walkthroughs to annual reviews, plus site
        closures. Every submission lands here for review, import, and export.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Tile label="Submissions today" value={String(entriesToday)} accent="#1f9d63" />
        <Tile label="Sites reporting today" value={String(sitesToday.size)} accent="#2f6fd6" />
        <Tile label="Submissions this week" value={String(entriesWeek)} accent="#b9700f" />
        <Tile
          label="Site closures (7 days)"
          value={String(closuresWeek)}
          accent={closuresWeek > 0 ? "#d24b4b" : "#1f9d63"}
        />
      </div>

      {groups.map((g) => (
        <section key={g.cadence} className="mb-8">
          <h2 className="text-lg font-extrabold text-[#0e1726] mb-3">
            {CADENCE_LABEL[g.cadence]}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {g.forms.map((f) => {
              const s = byForm.get(f.id);
              return (
                <Link
                  key={f.id}
                  href={`/app/reports/${f.id}`}
                  className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm p-5 hover:border-[#ff8a1e] transition block"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-extrabold text-[#0e1726]">{f.name}</div>
                    {f.department && (
                      <span className="text-xs font-bold rounded-full px-3 py-1 bg-[#eef1f6] text-[#5a6b85]">
                        {f.department}
                      </span>
                    )}
                  </div>
                  {f.due_note && (
                    <div className="text-xs text-[#b9700f] font-semibold mb-1">{f.due_note}</div>
                  )}
                  <div className="text-sm text-[#5a6b85]">
                    {s?.total ?? 0} entries
                    {s?.today ? ` · ${s.today} today` : ""}
                    {s?.last ? ` · last: ${s.last}` : " · none yet"}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] p-5 shadow-sm">
      <div className="text-xs font-bold tracking-wider text-[#5a6b85] uppercase mb-1">{label}</div>
      <div className="text-xl font-extrabold" style={{ color: accent }}>{value}</div>
    </div>
  );
}
