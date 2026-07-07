import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { atLeast, type UserRole } from "@/lib/roles";
import { DispatchBoard } from "./board";

const OPEN_STATUSES = ["open", "scheduled", "in_progress", "on_hold"];

function mondayOf(d: Date) {
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday = 0
  const m = new Date(d);
  m.setDate(d.getDate() - diff);
  m.setHours(0, 0, 0, 0);
  return m;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function DispatchPage({
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
  if (!me || !atLeast(me.role as UserRole, "manager")) redirect("/app");

  const start = mondayOf(week ? new Date(`${week}T12:00:00`) : new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return iso(d);
  });
  const prev = new Date(start);
  prev.setDate(start.getDate() - 7);
  const next = new Date(start);
  next.setDate(start.getDate() + 7);

  const [{ data: techs }, { data: scheduled }, { data: backlog }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, preferred_name, role")
        .neq("role", "customer")
        .neq("role", "readonly")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("work_orders")
        .select(
          "id, number, title, status, priority, wo_type, assigned_to, scheduled_date, customers(name), locations(label)"
        )
        .in("status", OPEN_STATUSES)
        .gte("scheduled_date", days[0])
        .lte("scheduled_date", days[6]),
      supabase
        .from("work_orders")
        .select(
          "id, number, title, status, priority, wo_type, assigned_to, scheduled_date, customers(name), locations(label)"
        )
        .in("status", OPEN_STATUSES)
        .is("scheduled_date", null)
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

  const mapWo = (w: NonNullable<typeof scheduled>[number]) => ({
    id: w.id,
    number: w.number,
    title: w.title,
    status: w.status,
    priority: w.priority,
    wo_type: w.wo_type,
    assigned_to: w.assigned_to,
    scheduled_date: w.scheduled_date,
    customer: (w.customers as unknown as { name: string } | null)?.name ?? null,
    site: (w.locations as unknown as { label: string } | null)?.label ?? null,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
          Dispatch
        </h1>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/app/dispatch?week=${iso(prev)}`}
            className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] font-semibold rounded-lg px-3 py-2 transition"
          >
            ← Prev
          </Link>
          <Link
            href="/app/dispatch"
            className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] font-semibold rounded-lg px-3 py-2 transition"
          >
            Today
          </Link>
          <Link
            href={`/app/dispatch?week=${iso(next)}`}
            className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] font-semibold rounded-lg px-3 py-2 transition"
          >
            Next →
          </Link>
        </div>
      </div>
      <p className="text-[#5a6b85] mb-5">
        Week of {start.toLocaleDateString("en-US", { month: "long", day: "numeric" })}.
        Drag work orders onto a tech&apos;s day — or tap a card on mobile to
        assign. Techs are emailed when opted in.
      </p>

      <DispatchBoard
        days={days}
        techs={(techs ?? []).map((t) => ({
          id: t.id,
          name: t.preferred_name || (t.full_name ?? "").split(" ")[0] || "—",
        }))}
        scheduled={(scheduled ?? []).map(mapWo)}
        backlog={(backlog ?? []).map(mapWo)}
      />
    </div>
  );
}
