import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TripBoard } from "./trip-board";

const OPEN_STATUSES = ["open", "scheduled", "on_hold"];

export default async function TripPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  const supabase = await createClient();

  // States that currently have open work, with counts.
  const { data: allOpen } = await supabase
    .from("work_orders")
    .select("state")
    .in("status", OPEN_STATUSES)
    .not("state", "is", null);

  const stateCounts = new Map<string, number>();
  for (const row of allOpen ?? []) {
    const s = (row.state as string).toUpperCase();
    stateCounts.set(s, (stateCounts.get(s) ?? 0) + 1);
  }
  const states = [...stateCounts.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const selected = state?.toUpperCase() ?? null;
  const { data: orders } = selected
    ? await supabase
        .from("work_orders")
        .select(
          "id, number, title, description, status, priority, trip_pick, address, city, state, zip, lat, lng, scheduled_date, is_pumping, customers(name)"
        )
        .in("status", OPEN_STATUSES)
        .eq("state", selected)
        .order("priority", { ascending: false })
        .order("created_at")
    : { data: null };

  return (
    <div>
      <Link
        href="/app/work-orders"
        className="text-sm text-[#5a6b85] hover:text-[#b9700f]"
      >
        ← Work orders
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726] mt-2 mb-2">
        Trip Planner
      </h1>
      <p className="text-[#5a6b85] mb-6">
        Heading somewhere? Pick a state to see every open work order there,
        mark <b className="text-[#1f9d63]">Yes</b> /{" "}
        <b className="text-[#b9700f]">Maybe</b> /{" "}
        <b className="text-[#d24b4b]">No</b>, then print your trip sheet.
      </p>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {states.length === 0 && (
          <span className="text-sm text-[#5a6b85]">
            No open work orders with a state set yet.
          </span>
        )}
        {states.map(([s, count]) => (
          <Link
            key={s}
            href={`/app/work-orders/trip?state=${s}`}
            className={`text-sm font-bold rounded-lg px-4 py-2 border transition ${
              selected === s
                ? "bg-[#0e1f38] text-white border-[#0e1f38]"
                : "bg-white text-[#0e1726] border-[#e4e9f1] hover:border-[#ff8a1e]"
            }`}
          >
            {s}
            <span
              className={`ml-1.5 text-xs font-bold rounded-full px-1.5 py-0.5 ${
                selected === s
                  ? "bg-[#ff8a1e] text-white"
                  : "bg-[#fff2e3] text-[#b9700f]"
              }`}
            >
              {count}
            </span>
          </Link>
        ))}
      </div>

      {selected && orders && (
        <TripBoard state={selected} orders={orders} />
      )}
    </div>
  );
}
