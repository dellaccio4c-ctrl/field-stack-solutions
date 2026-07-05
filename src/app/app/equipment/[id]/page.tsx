import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "../../status-badge";

function fmtTs(ts: string) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: eq } = await supabase
    .from("equipment")
    .select("*, customers(name), locations(label, address)")
    .eq("id", id)
    .single();
  if (!eq) notFound();

  const { data: history } = await supabase
    .from("work_orders")
    .select(
      "id, number, title, status, priority, created_at, completed_at, started_at, minutes_on_site, assignee:profiles!work_orders_assigned_to_fkey(full_name, preferred_name)"
    )
    .eq("equipment_id", id)
    .order("created_at", { ascending: false });

  const totalMinutes = (history ?? []).reduce(
    (s, wo) => s + (wo.minutes_on_site ?? 0),
    0
  );
  const completed = (history ?? []).filter((wo) => wo.status === "completed");
  const ageYears = eq.install_date
    ? (
        (Date.now() - new Date(eq.install_date).getTime()) /
        (1000 * 60 * 60 * 24 * 365.25)
      ).toFixed(1)
    : null;

  return (
    <div>
      <Link
        href="/app/equipment"
        className="text-sm text-[#5a6b85] hover:text-[#b9700f]"
      >
        ← All equipment
      </Link>

      <div className="flex items-start justify-between mt-2 mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
              {eq.name}
            </h1>
            <span
              className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                eq.status === "active"
                  ? "bg-[#e3f6ec] text-[#1f9d63]"
                  : "bg-[#eef1f6] text-[#5a6b85]"
              }`}
            >
              {eq.status}
            </span>
          </div>
          <div className="text-sm text-[#5a6b85] mt-1">
            {(eq.customers as unknown as { name: string } | null)?.name}
            {eq.locations
              ? ` — ${(eq.locations as unknown as { label: string }).label}`
              : ""}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-sm">
        <Spec label="Category" value={eq.category} />
        <Spec label="Brand" value={eq.brand} />
        <Spec label="Model" value={eq.model} />
        <Spec label="Serial number" value={eq.serial_number} mono />
        <Spec label="Unit #" value={eq.unit_number} />
        <Spec
          label="Installed"
          value={
            eq.install_date
              ? `${eq.install_date}${ageYears ? ` (${ageYears} yrs)` : ""}`
              : null
          }
        />
        <Spec label="Warranty expires" value={eq.warranty_expires} />
        <Spec
          label="Lifetime service"
          value={`${history?.length ?? 0} work orders · ${completed.length} completed${
            totalMinutes ? ` · ${Math.round(totalMinutes / 60)}h on site` : ""
          }`}
        />
      </div>

      {eq.notes && (
        <div className="bg-[#fff2e3] rounded-2xl p-5 mb-6 text-sm text-[#0e1726]">
          <div className="text-xs font-bold tracking-wider text-[#b9700f] mb-1">
            NOTES
          </div>
          {eq.notes}
        </div>
      )}

      <h2 className="text-lg font-extrabold text-[#0e1726] mb-3">
        Service history
      </h2>
      {!history?.length ? (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-8 text-center text-[#5a6b85] text-sm">
          No work orders yet for this unit. Pick it when creating a work order
          and its history builds automatically.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1]">
                <th className="px-5 py-3.5 font-semibold">#</th>
                <th className="px-5 py-3.5 font-semibold">Work order</th>
                <th className="px-5 py-3.5 font-semibold">Tech</th>
                <th className="px-5 py-3.5 font-semibold">Created</th>
                <th className="px-5 py-3.5 font-semibold">Completed</th>
                <th className="px-5 py-3.5 font-semibold text-right">On site</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((wo) => {
                const assignee = wo.assignee as unknown as {
                  full_name: string;
                  preferred_name: string | null;
                } | null;
                return (
                  <tr
                    key={wo.id}
                    className="border-b border-[#e4e9f1] last:border-0 hover:bg-[#f5f7fb]"
                  >
                    <td className="px-5 py-3.5 text-[#5a6b85]">
                      WO-{String(wo.number).padStart(4, "0")}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/app/work-orders/${wo.id}`}
                        className="font-semibold text-[#0e1726] hover:text-[#b9700f]"
                      >
                        {wo.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[#5a6b85]">
                      {assignee
                        ? assignee.preferred_name || assignee.full_name
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[#5a6b85]">
                      {fmtTs(wo.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-[#5a6b85]">
                      {wo.completed_at ? fmtTs(wo.completed_at) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right text-[#5a6b85]">
                      {wo.minutes_on_site ? `${wo.minutes_on_site} min` : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={wo.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Spec({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] p-4">
      <div className="text-xs font-bold tracking-wider text-[#5a6b85] uppercase mb-1">
        {label}
      </div>
      <div className={`font-semibold text-[#0e1726] ${mono ? "font-mono text-sm" : ""}`}>
        {value ?? "—"}
      </div>
    </div>
  );
}
