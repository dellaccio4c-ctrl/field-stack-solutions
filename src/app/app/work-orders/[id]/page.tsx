import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge, PriorityBadge, WoTypeBadge } from "../../status-badge";
import { WorkOrderActions } from "./work-order-actions";
import { PhotoSection } from "./photo-section";
import { NoteForm } from "./note-form";
import { SlaBadge } from "../sla-badge";

function fmtTs(ts: string) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function duration(startIso: string, endIso: string) {
  const mins = Math.round(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000
  );
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
}

const EVENT_ICON: Record<string, string> = {
  created: "●",
  status: "→",
  assigned: "👤",
  scheduled: "📅",
  note: "✎",
  photo: "📷",
  trip_pick: "🗺",
};

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  const isOwner = me?.role === "owner";

  const [{ data: wo }, { data: staff }] = await Promise.all([
    supabase
      .from("work_orders")
      .select(
        `*, customers(name), locations(label), equipment(id, name, unit_number, serial_number),
         assignee:profiles!work_orders_assigned_to_fkey(full_name, preferred_name),
         creator:profiles!work_orders_created_by_fkey(full_name, preferred_name),
         work_order_events(id, kind, detail, created_at, actor:profiles(full_name, preferred_name)),
         work_order_photos(id, url, caption, created_at, photographer:profiles(full_name, preferred_name))`
      )
      .eq("id", id)
      .single(),
    supabase
      .from("profiles")
      .select("id, full_name, preferred_name")
      .in("role", ["field", "manager", "admin", "owner", "xpress_pumping"])
      .eq("is_active", true)
      .order("full_name"),
  ]);

  if (!wo) notFound();

  const events = (wo.work_order_events ?? []).sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const photos = (wo.work_order_photos ?? []).sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const assignee = wo.assignee as unknown as {
    full_name: string;
    preferred_name: string | null;
  } | null;

  const fullAddress = [wo.address, wo.city, wo.state, wo.zip]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <Link
        href="/app/work-orders"
        className="text-sm text-[#5a6b85] hover:text-[#b9700f]"
      >
        ← All work orders
      </Link>

      <div className="flex items-start justify-between mt-2 mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
              WO-{String(wo.number).padStart(4, "0")}
            </h1>
            <StatusBadge status={wo.status} />
            <PriorityBadge priority={wo.priority} />
            <WoTypeBadge type={wo.wo_type} />
            <SlaBadge wo={wo} />
          </div>
          <div className="text-[#0e1726] font-semibold mt-1 text-lg">
            {wo.title}
          </div>
          <div className="text-sm text-[#5a6b85] space-x-3">
            {(wo.customers as unknown as { name: string } | null)?.name && (
              <span>
                {(wo.customers as unknown as { name: string }).name}
                {wo.locations
                  ? ` — ${(wo.locations as unknown as { label: string }).label}`
                  : ""}
              </span>
            )}
            {fullAddress && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                target="_blank"
                className="hover:text-[#b9700f]"
              >
                📍 {fullAddress}
              </a>
            )}
          </div>
        </div>
        <WorkOrderActions
          workOrderId={wo.id}
          status={wo.status}
          assignedTo={wo.assigned_to}
          scheduledDate={wo.scheduled_date}
          scheduledEnd={wo.scheduled_end}
          staff={staff ?? []}
        />
      </div>

      {wo.description && (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-5 mb-6 text-sm text-[#0e1726] whitespace-pre-wrap">
          {wo.description}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-sm">
        <Fact label="Assigned to">
          {assignee ? assignee.preferred_name || assignee.full_name : "Unassigned"}
        </Fact>
        <Fact label="Scheduled">
          {wo.scheduled_date
            ? `${wo.scheduled_date}${wo.scheduled_end ? ` – ${wo.scheduled_end}` : ""}`
            : "Not scheduled"}
        </Fact>
        <Fact label="Started">
          {wo.started_at ? fmtTs(wo.started_at) : "—"}
        </Fact>
        <Fact label="Completed">
          {wo.completed_at ? fmtTs(wo.completed_at) : "—"}
        </Fact>
        {wo.equipment && (
          <Fact label="Equipment">
            <Link
              href={`/app/equipment/${(wo.equipment as unknown as { id: string }).id}`}
              className="hover:text-[#b9700f]"
            >
              {(wo.equipment as unknown as { name: string }).name}
              {(wo.equipment as unknown as { unit_number: string | null })
                .unit_number
                ? ` (Unit ${(wo.equipment as unknown as { unit_number: string }).unit_number})`
                : ""}
              {" →"}
            </Link>
          </Fact>
        )}
      </div>

      {isOwner && wo.completed_at && (
        <div className="bg-[#fff2e3] rounded-2xl p-4 mb-6 text-sm">
          <b className="text-[#b9700f]">Owner metric — time to complete:</b>{" "}
          {wo.started_at
            ? duration(wo.started_at, wo.completed_at)
            : "no start time recorded"}
          {wo.minutes_on_site
            ? ` · reported on-site time: ${wo.minutes_on_site} min`
            : ""}
          {" · created → completed: "}
          {duration(wo.created_at, wo.completed_at)}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <PhotoSection workOrderId={wo.id} photos={photos} />
        </div>

        <div>
          <h2 className="text-lg font-extrabold text-[#0e1726] mb-3">
            Activity timeline
          </h2>
          <NoteForm workOrderId={wo.id} />
          <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm divide-y divide-[#e4e9f1] mt-3">
            {events.map(
              (ev: {
                id: string;
                kind: string;
                detail: string | null;
                created_at: string;
                actor: { full_name: string; preferred_name: string | null } | null;
              }) => (
                <div key={ev.id} className="px-4 py-3 flex gap-3 text-sm">
                  <span className="w-6 text-center flex-shrink-0">
                    {EVENT_ICON[ev.kind] ?? "•"}
                  </span>
                  <div className="flex-1">
                    <span
                      className={
                        ev.kind === "note" ? "text-[#0e1726]" : "text-[#5a6b85]"
                      }
                    >
                      {ev.detail}
                    </span>
                    <div className="text-xs text-[#5a6b85] mt-0.5">
                      {ev.actor
                        ? `${ev.actor.preferred_name || ev.actor.full_name} · `
                        : ""}
                      {fmtTs(ev.created_at)}
                    </div>
                  </div>
                </div>
              )
            )}
            {!events.length && (
              <div className="px-4 py-6 text-center text-[#5a6b85] text-sm">
                No activity yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] p-4">
      <div className="text-xs font-bold tracking-wider text-[#5a6b85] uppercase mb-1">
        {label}
      </div>
      <div className="font-semibold text-[#0e1726]">{children}</div>
    </div>
  );
}
