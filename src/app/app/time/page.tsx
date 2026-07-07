import { createClient } from "@/lib/supabase/server";
import { atLeast, type UserRole } from "@/lib/roles";
import { ClockCard } from "./clock-card";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function fmtHours(mins: number) {
  return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;
}

export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  const isManager = !!me && atLeast(me.role as UserRole, "manager");

  // Week window (Monday-start)
  const base = week ? new Date(`${week}T12:00:00`) : new Date();
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);

  const [{ data: myOpen }, { data: entries }, { data: myWos }] =
    await Promise.all([
      supabase
        .from("time_entries")
        .select("id, clock_in, work_order_id, work_orders(number, title)")
        .eq("user_id", user!.id)
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(1),
      supabase
        .from("time_entries")
        .select(
          "id, user_id, clock_in, clock_out, notes, work_orders(number, title), profiles:user_id(full_name, preferred_name)"
        )
        .gte("clock_in", monday.toISOString())
        .lt("clock_in", sunday.toISOString())
        .order("clock_in", { ascending: false }),
      supabase
        .from("work_orders")
        .select("id, number, title")
        .eq("assigned_to", user!.id)
        .in("status", ["open", "scheduled", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const rows = (entries ?? []).map((e) => {
    const p = e.profiles as unknown as {
      full_name: string | null;
      preferred_name: string | null;
    } | null;
    const wo = e.work_orders as unknown as { number: number; title: string } | null;
    const mins = e.clock_out
      ? (new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) / 60000
      : null;
    return {
      id: e.id,
      user_id: e.user_id,
      who: p?.preferred_name || p?.full_name?.split(" ")[0] || "—",
      clock_in: e.clock_in,
      clock_out: e.clock_out,
      notes: e.notes,
      wo: wo ? `WO-${wo.number} ${wo.title}` : null,
      mins,
    };
  });

  const totals = new Map<string, number>();
  for (const r of rows)
    if (r.mins != null)
      totals.set(r.who, (totals.get(r.who) ?? 0) + r.mins);

  const myRows = rows.filter((r) => r.user_id === user!.id);
  const openEntry = myOpen?.[0]
    ? {
        clockIn: myOpen[0].clock_in,
        woLabel: (() => {
          const wo = myOpen[0].work_orders as unknown as {
            number: number;
            title: string;
          } | null;
          return wo ? `WO-${wo.number} · ${wo.title}` : null;
        })(),
      }
    : null;

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726] mb-2">
        Time Clock
      </h1>
      <p className="text-[#5a6b85] mb-6">
        Clock in when you start, out when you stop — optionally tied to the
        work order you&apos;re on. Hours feed timesheets and job costing.
      </p>

      <ClockCard
        openEntry={openEntry}
        workOrders={(myWos ?? []).map((w) => ({
          id: w.id,
          label: `WO-${w.number} · ${w.title}`,
        }))}
      />

      <section className="mt-8">
        <h2 className="text-lg font-extrabold text-[#0e1726] mb-3">
          {isManager ? "Timesheet — this week (all staff)" : "My week"}
        </h2>
        {isManager && totals.size > 0 && (
          <div className="flex flex-wrap gap-3 mb-4">
            {[...totals.entries()].map(([who, mins]) => (
              <div key={who} className="bg-white rounded-xl border border-[#e4e9f1] px-4 py-2 text-sm">
                <span className="font-bold">{who}</span>{" "}
                <span className="text-[#1f9d63] font-semibold">{fmtHours(mins)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
          {!(isManager ? rows : myRows).length ? (
            <div className="p-8 text-center text-[#5a6b85] text-sm">
              No time entries this week yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1]">
                  {isManager && <th className="px-4 py-3 font-semibold">Who</th>}
                  <th className="px-4 py-3 font-semibold">In</th>
                  <th className="px-4 py-3 font-semibold">Out</th>
                  <th className="px-4 py-3 font-semibold text-right">Hours</th>
                  <th className="px-4 py-3 font-semibold">Work order</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {(isManager ? rows : myRows).map((r) => (
                  <tr key={r.id} className="border-b border-[#e4e9f1] last:border-0">
                    {isManager && <td className="px-4 py-3 font-semibold">{r.who}</td>}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(r.clock_in).toLocaleString("en-US", {
                        weekday: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.clock_out
                        ? new Date(r.clock_out).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : <span className="text-[#1f9d63] font-semibold">on the clock</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {r.mins != null ? fmtHours(r.mins) : "—"}
                    </td>
                    <td className="px-4 py-3 text-[#5a6b85] max-w-56 truncate">{r.wo ?? "—"}</td>
                    <td className="px-4 py-3 text-[#5a6b85] max-w-48 truncate">{r.notes ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
