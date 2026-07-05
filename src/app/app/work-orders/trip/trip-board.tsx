"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { setTripPick, clearTripPicks } from "../actions";
import { PriorityBadge, StatusBadge } from "../../status-badge";

const TripMap = dynamic(() => import("./trip-map"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-2xl border border-[#e4e9f1] bg-white flex items-center justify-center text-[#5a6b85] text-sm mb-6"
      style={{ height: 320 }}
    >
      Loading map…
    </div>
  ),
});

export type TripOrder = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  trip_pick: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  scheduled_date: string | null;
  is_pumping: boolean;
  customers: unknown;
};

export function TripBoard({
  state,
  orders,
}: {
  state: string;
  orders: TripOrder[];
}) {
  // Optimistic picks so the buttons feel instant.
  const [picks, setPicks] = useState<Record<string, string | null>>(
    Object.fromEntries(orders.map((o) => [o.id, o.trip_pick]))
  );
  const [busy, setBusy] = useState<string | null>(null);

  async function pick(id: string, value: "yes" | "no" | "maybe") {
    setPicks((p) => ({ ...p, [id]: value }));
    setBusy(id);
    await setTripPick(id, value);
    setBusy(null);
  }

  async function resetPicks() {
    setPicks(Object.fromEntries(orders.map((o) => [o.id, null])));
    await clearTripPicks(state);
  }

  const counts = useMemo(() => {
    const values = Object.values(picks);
    return {
      yes: values.filter((v) => v === "yes").length,
      maybe: values.filter((v) => v === "maybe").length,
      no: values.filter((v) => v === "no").length,
    };
  }, [picks]);

  return (
    <>
      <TripMap
        orders={orders.map((o) => ({ ...o, trip_pick: picks[o.id] ?? null }))}
      />

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="text-sm font-semibold text-[#0e1726]">
          {orders.length} open in {state} ·{" "}
          <span className="text-[#1f9d63]">{counts.yes} yes</span> ·{" "}
          <span className="text-[#b9700f]">{counts.maybe} maybe</span> ·{" "}
          <span className="text-[#d24b4b]">{counts.no} no</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetPicks}
            className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] text-[#0e1726] font-semibold rounded-lg px-4 py-2 text-sm transition"
          >
            Reset picks
          </button>
          <Link
            href={`/app/work-orders/trip/print?state=${state}`}
            className={`font-semibold rounded-lg px-4 py-2 text-sm transition ${
              counts.yes + counts.maybe > 0
                ? "bg-[#ff8a1e] hover:bg-[#ffa347] text-white"
                : "bg-[#eef1f6] text-[#5a6b85] pointer-events-none"
            }`}
          >
            🖨 Print trip sheet ({counts.yes + counts.maybe})
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {orders.map((wo) => {
          const current = picks[wo.id];
          return (
            <div
              key={wo.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm transition ${
                current === "yes"
                  ? "border-[#1f9d63]"
                  : current === "maybe"
                    ? "border-[#ff8a1e]"
                    : current === "no"
                      ? "border-[#e4e9f1] opacity-50"
                      : "border-[#e4e9f1]"
              }`}
            >
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/app/work-orders/${wo.id}`}
                      className="font-bold text-[#0e1726] hover:text-[#b9700f]"
                    >
                      WO-{String(wo.number).padStart(4, "0")} — {wo.title}
                    </Link>
                    <StatusBadge status={wo.status} />
                    <PriorityBadge priority={wo.priority} />
                    {wo.is_pumping && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f0fd] text-[#2f6fd6]">
                        Pumping
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-[#5a6b85] mt-1">
                    {(wo.customers as { name: string } | null)?.name && (
                      <b>{(wo.customers as { name: string }).name} · </b>
                    )}
                    {[wo.address, wo.city, wo.zip].filter(Boolean).join(", ")}
                    {wo.scheduled_date && ` · scheduled ${wo.scheduled_date}`}
                  </div>
                  {wo.description && (
                    <div className="text-sm text-[#5a6b85] mt-1 line-clamp-2">
                      {wo.description}
                    </div>
                  )}
                </div>

                <div className="flex gap-1.5">
                  {(["yes", "maybe", "no"] as const).map((value) => {
                    const active = current === value;
                    const activeColors = {
                      yes: "bg-[#1f9d63] text-white border-[#1f9d63]",
                      maybe: "bg-[#ff8a1e] text-white border-[#ff8a1e]",
                      no: "bg-[#5a6b85] text-white border-[#5a6b85]",
                    };
                    return (
                      <button
                        key={value}
                        onClick={() => pick(wo.id, value)}
                        disabled={busy === wo.id}
                        className={`font-bold rounded-lg px-4 py-2 text-sm border capitalize transition disabled:opacity-60 ${
                          active
                            ? activeColors[value]
                            : "bg-white text-[#0e1726] border-[#e4e9f1] hover:border-[#ff8a1e]"
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
