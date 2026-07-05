import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge, PriorityBadge, WoTypeBadge } from "../../status-badge";
import { WorkOrderActions } from "./work-order-actions";
import { PhotoSection } from "./photo-section";
import { NoteForm } from "./note-form";
import { SlaBadge } from "../sla-badge";
import { BackLink } from "../../back-link";

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

  const [{ data: wo }, { data: staff }, { data: partsUsed }] =
    await Promise.all([
      supabase
        .from("work_orders")
        .select(
          `*, customers(name), locations(label), equipment(id, name, unit_number, serial_number),
           assignee:profiles!work_orders_assigned_to_fkey(full_name, preferred_name, hourly_cost),
           creator:profiles!work_orders_created_by_fkey(full_name, preferred_name),
           invoice:invoices(id, number, tax_rate, line_items(quantity, unit_price)),
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
      supabase
        .from("inventory_movements")
        .select("delta, inventory_items(name, unit_cost)")
        .eq("work_order_id", id)
        .lt("delta", 0),
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
      <BackLink fallback="/app/work-orders" label="All work orders" />

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
          hasInvoice={Boolean(wo.invoice_id)}
          hasCustomer={Boolean(wo.customer_id)}
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
        {wo.invoice && (
          <Fact label="Invoice">
            <Link
              href={`/app/invoices/${(wo.invoice as unknown as { id: string }).id}`}
              className="hover:text-[#b9700f]"
            >
              INV-
              {String(
                (wo.invoice as unknown as { number: number }).number
              ).padStart(4, "0")}
              {" →"}
            </Link>
          </Fact>
        )}
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

      {["owner", "admin", "manager"].includes(me?.role ?? "") &&
        (() => {
          const assigneeRate =
            (wo.assignee as unknown as { hourly_cost: number | null } | null)
              ?.hourly_cost ?? null;
          const laborMinutes =
            wo.minutes_on_site ??
            (wo.started_at && wo.completed_at
              ? Math.round(
                  (new Date(wo.completed_at).getTime() -
                    new Date(wo.started_at).getTime()) /
                    60000
                )
              : 0);
          const laborCost = assigneeRate
            ? (laborMinutes / 60) * Number(assigneeRate)
            : null;
          const parts = (partsUsed ?? []).map((m) => {
            const item = m.inventory_items as unknown as {
              name: string;
              unit_cost: number | null;
            } | null;
            return {
              name: item?.name ?? "part",
              qty: -m.delta,
              cost: item?.unit_cost ? -m.delta * Number(item.unit_cost) : 0,
            };
          });
          const partsCost = parts.reduce((s, p) => s + p.cost, 0);
          const invoice = wo.invoice as unknown as {
            number: number;
            tax_rate: number;
            line_items: { quantity: number; unit_price: number }[];
          } | null;
          const revenue = invoice
            ? invoice.line_items.reduce(
                (s, i) => s + Number(i.quantity) * Number(i.unit_price),
                0
              ) *
              (1 + Number(invoice.tax_rate))
            : null;
          const totalCost = (laborCost ?? 0) + partsCost;
          const hasData =
            laborCost !== null || parts.length > 0 || revenue !== null;
          if (!hasData) return null;

          const fmt = (n: number) =>
            n.toLocaleString("en-US", { style: "currency", currency: "USD" });

          return (
            <div className="bg-white rounded-2xl border border-[#e4e9f1] p-5 mb-6 shadow-sm">
              <h2 className="text-sm font-extrabold tracking-wider text-[#b9700f] uppercase mb-3">
                Job costing
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-xs font-bold text-[#5a6b85] uppercase mb-1">
                    Labor
                  </div>
                  <div className="font-bold">
                    {laborCost !== null
                      ? `${fmt(laborCost)} (${laborMinutes} min)`
                      : laborMinutes
                        ? `${laborMinutes} min — set tech's $/hr on Team`
                        : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#5a6b85] uppercase mb-1">
                    Parts ({parts.length})
                  </div>
                  <div className="font-bold">{fmt(partsCost)}</div>
                  {parts.length > 0 && (
                    <div className="text-xs text-[#5a6b85] mt-0.5">
                      {parts.map((p) => `${p.qty}× ${p.name}`).join(", ")}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#5a6b85] uppercase mb-1">
                    Revenue
                  </div>
                  <div className="font-bold">
                    {revenue !== null ? fmt(revenue) : "no linked invoice"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#5a6b85] uppercase mb-1">
                    Margin
                  </div>
                  <div
                    className={`font-bold ${
                      revenue !== null
                        ? revenue - totalCost >= 0
                          ? "text-[#1f9d63]"
                          : "text-[#d24b4b]"
                        : ""
                    }`}
                  >
                    {revenue !== null
                      ? `${fmt(revenue - totalCost)} (${revenue > 0 ? Math.round(((revenue - totalCost) / revenue) * 100) : 0}%)`
                      : "—"}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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
