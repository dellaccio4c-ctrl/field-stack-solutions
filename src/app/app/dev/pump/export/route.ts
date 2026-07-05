import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROLE_RANK, type UserRole } from "@/lib/roles";
import { projectNext, isoDate, type PumpSite } from "@/lib/pump";

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!me || ROLE_RANK[me.role as UserRole] < 3)
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });

  const { data: sites } = await supabase
    .from("pump_sites")
    .select("*")
    .eq("is_active", true)
    .order("client_name");

  const rows = (sites ?? [])
    .map((s: PumpSite) => ({ s, p: projectNext(s) }))
    .sort((a, b) => {
      if (!a.p.nextDue) return 1;
      if (!b.p.nextDue) return -1;
      return a.p.nextDue.getTime() - b.p.nextDue.getTime();
    })
    .map(({ s, p }) => [
      s.client_name,
      s.site_label ?? "",
      s.address,
      `${s.interval_months} months`,
      s.last_pumped ?? "",
      isoDate(p.windowStart),
      isoDate(p.nextDue),
      isoDate(p.windowEnd),
      p.daysUntil === null ? "" : p.overdue ? "OVERDUE" : `${p.daysUntil} days`,
      s.notes ?? "",
    ]);

  const csv = [
    [
      "Client",
      "Site",
      "Address",
      "Interval",
      "Last pumped",
      "Window start",
      "Projected date",
      "Window end",
      "Due in",
      "Notes",
    ].join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ].join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pump-schedule-${stamp}.csv"`,
    },
  });
}
