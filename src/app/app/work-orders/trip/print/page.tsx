import { createClient } from "@/lib/supabase/server";
import { TripPrintControls } from "./trip-print-controls";

const OPEN_STATUSES = ["open", "scheduled", "on_hold"];

export default async function TripPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; include?: string }>;
}) {
  const { state, include } = await searchParams;
  const selected = state?.toUpperCase() ?? "";
  const includeMaybe = include !== "yes-only";

  const supabase = await createClient();
  const picks = includeMaybe ? ["yes", "maybe"] : ["yes"];
  const { data: orders } = await supabase
    .from("work_orders")
    .select(
      "id, number, title, description, priority, trip_pick, address, city, state, zip, scheduled_date, customers(name, phone), locations(label)"
    )
    .in("status", OPEN_STATUSES)
    .eq("state", selected)
    .in("trip_pick", picks)
    .order("trip_pick")
    .order("city");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-[800px] mx-auto p-8 bg-white min-h-screen text-[#0e1726]">
      <TripPrintControls state={selected} includeMaybe={includeMaybe} />

      <div className="flex items-center justify-between border-b-2 border-[#0e1f38] pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Trip Sheet — {selected}
          </h1>
          <div className="text-sm text-[#5a6b85]">
            {orders?.length ?? 0} stop{(orders?.length ?? 0) === 1 ? "" : "s"} (
            {includeMaybe ? "yes + maybe" : "yes only"}) · Printed {today}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/fss-badge-navy.png"
          alt="FSS"
          className="w-14 h-14 rounded-full object-cover print:w-12 print:h-12"
        />
      </div>

      {!orders?.length ? (
        <p className="text-[#5a6b85]">
          No picked work orders for {selected || "this state"}. Go back to the
          trip planner and mark some Yes or Maybe.
        </p>
      ) : (
        <div className="space-y-4">
          {orders.map((wo, i) => (
            <div
              key={wo.id}
              className="border border-[#e4e9f1] rounded-xl p-4 break-inside-avoid"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <b>
                    {i + 1}. WO-{String(wo.number).padStart(4, "0")} — {wo.title}
                  </b>
                  {wo.trip_pick === "maybe" && (
                    <span className="ml-2 text-xs font-bold text-[#b9700f]">
                      (MAYBE)
                    </span>
                  )}
                  {wo.priority !== "normal" && (
                    <span className="ml-2 text-xs font-bold uppercase text-[#d24b4b]">
                      {wo.priority}
                    </span>
                  )}
                  <div className="text-sm mt-1">
                    {(wo.customers as unknown as { name: string } | null)
                      ?.name && (
                      <b>
                        {(wo.customers as unknown as { name: string }).name}
                        {(
                          wo.customers as unknown as { phone: string | null }
                        ).phone
                          ? ` · ${(wo.customers as unknown as { phone: string }).phone}`
                          : ""}
                        {" · "}
                      </b>
                    )}
                    {[wo.address, wo.city, wo.state, wo.zip]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                  {wo.description && (
                    <div className="text-sm text-[#5a6b85] mt-1">
                      {wo.description}
                    </div>
                  )}
                </div>
                <div className="w-6 h-6 border-2 border-[#0e1f38] rounded flex-shrink-0" />
              </div>
              <div className="text-xs text-[#5a6b85] mt-3 border-t border-dashed border-[#e4e9f1] pt-2">
                Arrived: ________ Departed: ________ Notes:
                ______________________________________________
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 text-xs text-[#5a6b85] border-t border-[#e4e9f1] pt-3">
        Field Stack Solutions · fieldstacksolutions.com · Technician:
        ______________ Date completed: ______________
      </div>
    </div>
  );
}
