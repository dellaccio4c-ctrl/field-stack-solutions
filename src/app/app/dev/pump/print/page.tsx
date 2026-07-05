import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_RANK, type UserRole } from "@/lib/roles";
import { projectNext, fmtDate, type PumpSite } from "@/lib/pump";
import { PrintControls } from "./print-controls";

export default async function PumpPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = daysParam === "all" ? null : parseInt(daysParam || "30", 10);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (
    !me ||
    (ROLE_RANK[me.role as UserRole] < 3 && me.role !== "xpress_pumping")
  )
    redirect("/app");

  const { data: sites } = await supabase
    .from("pump_sites")
    .select("*")
    .eq("is_active", true);

  const rows = (sites ?? [])
    .map((s: PumpSite) => ({ s, p: projectNext(s) }))
    .filter(({ p }) => {
      if (!p.nextDue) return days === null;
      if (days === null) return true;
      return p.daysUntil !== null && p.daysUntil <= days;
    })
    .sort((a, b) => {
      if (!a.p.nextDue) return 1;
      if (!b.p.nextDue) return -1;
      return a.p.nextDue.getTime() - b.p.nextDue.getTime();
    });

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-[800px] mx-auto p-8 bg-white min-h-screen text-[#0e1726]">
      <PrintControls currentDays={daysParam ?? "30"} />

      <div className="flex items-center justify-between border-b-2 border-[#0e1f38] pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Pump-Out Trip Schedule
          </h1>
          <div className="text-sm text-[#5a6b85]">
            {days === null ? "All sites" : `Due within ${days} days`} · Printed{" "}
            {today}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/fss-badge-navy.png"
          alt="FSS"
          className="w-14 h-14 rounded-full object-cover print:w-12 print:h-12"
        />
      </div>

      {!rows.length ? (
        <p className="text-[#5a6b85]">
          Nothing due in this window. Widen the range or check back later.
        </p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b-2 border-[#0e1f38]">
              <th className="py-2 pr-2 w-8">✓</th>
              <th className="py-2 pr-3 font-bold">Client / Site</th>
              <th className="py-2 pr-3 font-bold">Address</th>
              <th className="py-2 pr-3 font-bold whitespace-nowrap">
                Service window
              </th>
              <th className="py-2 font-bold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, p }) => (
              <tr
                key={s.id}
                className="border-b border-[#e4e9f1] align-top break-inside-avoid"
              >
                <td className="py-3 pr-2">
                  <div className="w-5 h-5 border-2 border-[#0e1f38] rounded" />
                </td>
                <td className="py-3 pr-3">
                  <b>{s.client_name}</b>
                  {s.site_label && (
                    <div className="text-[#5a6b85]">{s.site_label}</div>
                  )}
                </td>
                <td className="py-3 pr-3">{s.address}</td>
                <td className="py-3 pr-3 whitespace-nowrap">
                  {p.nextDue ? (
                    <>
                      {fmtDate(p.windowStart)} –<br />
                      {fmtDate(p.windowEnd)}
                      {p.overdue && (
                        <div className="font-bold text-[#d24b4b]">OVERDUE</div>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3 text-[#5a6b85]">{s.notes ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-8 text-xs text-[#5a6b85] border-t border-[#e4e9f1] pt-3">
        Field Stack Solutions · fieldstacksolutions.com · Completed date:
        ______________ Technician: ______________
      </div>
    </div>
  );
}
