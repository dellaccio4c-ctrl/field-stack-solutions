import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge, PriorityBadge } from "../status-badge";
import { NewWorkOrderModal } from "./new-work-order-modal";

const OPEN_STATUSES = ["open", "scheduled", "in_progress", "on_hold"];

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; state?: string; assignee?: string }>;
}) {
  const { status, state, assignee } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("work_orders")
    .select(
      "id, number, title, status, priority, state, city, scheduled_date, is_pumping, customers(name), assignee:profiles!work_orders_assigned_to_fkey(full_name, preferred_name)"
    )
    .order("created_at", { ascending: false });

  if (status === "done") query = query.in("status", ["completed", "cancelled"]);
  else if (status) query = query.eq("status", status);
  else query = query.in("status", OPEN_STATUSES);
  if (state) query = query.eq("state", state.toUpperCase());
  if (assignee) query = query.eq("assigned_to", assignee);

  const [{ data: orders }, { data: customers }, { data: staff }] =
    await Promise.all([
      query,
      supabase
        .from("customers")
        .select("id, name, locations(id, label, address, city, state, zip)")
        .order("name"),
      supabase
        .from("profiles")
        .select("id, full_name, preferred_name")
        .in("role", ["field", "manager", "admin", "owner", "xpress_pumping"])
        .eq("is_active", true)
        .order("full_name"),
    ]);

  const filters = [
    ["", "Open work"],
    ["open", "Open"],
    ["scheduled", "Scheduled"],
    ["in_progress", "In progress"],
    ["on_hold", "On hold"],
    ["done", "Completed"],
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
          Work Orders
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/app/work-orders/trip"
            className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] text-[#0e1726] font-semibold rounded-lg px-4 py-2 text-sm transition"
          >
            🗺 Trip Planner
          </Link>
          <NewWorkOrderModal customers={customers ?? []} staff={staff ?? []} />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {filters.map(([value, label]) => (
          <Link
            key={value}
            href={value ? `/app/work-orders?status=${value}` : "/app/work-orders"}
            className={`text-sm font-semibold rounded-lg px-3 py-1.5 border transition ${
              (status ?? "") === value
                ? "bg-[#0e1f38] text-white border-[#0e1f38]"
                : "bg-white text-[#0e1726] border-[#e4e9f1] hover:border-[#ff8a1e]"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {!orders?.length ? (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-10 text-center text-[#5a6b85]">
          No work orders in this view.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1]">
                <th className="px-5 py-3.5 font-semibold">#</th>
                <th className="px-5 py-3.5 font-semibold">Work order</th>
                <th className="px-5 py-3.5 font-semibold">Customer</th>
                <th className="px-5 py-3.5 font-semibold">Where</th>
                <th className="px-5 py-3.5 font-semibold">Assigned</th>
                <th className="px-5 py-3.5 font-semibold">Scheduled</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((wo) => {
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
                      <span className="ml-2 space-x-1">
                        <PriorityBadge priority={wo.priority} />
                        {wo.is_pumping && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f0fd] text-[#2f6fd6]">
                            Pumping
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#5a6b85]">
                      {(wo.customers as unknown as { name: string } | null)
                        ?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[#5a6b85]">
                      {[wo.city, wo.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[#5a6b85]">
                      {assignee
                        ? assignee.preferred_name || assignee.full_name
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[#5a6b85]">
                      {wo.scheduled_date ?? "—"}
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
