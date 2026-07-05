"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
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

export type Pick = {
  work_order_id: string;
  user_id: string;
  pick: string;
  name: string;
};

const PICK_CHIP: Record<string, string> = {
  yes: "bg-[#e3f6ec] text-[#1f9d63]",
  maybe: "bg-[#fff2e3] text-[#b9700f]",
  no: "bg-[#eef1f6] text-[#5a6b85]",
};

export function TripBoard({
  state,
  orders,
  initialPicks,
  myUserId,
}: {
  state: string;
  orders: TripOrder[];
  initialPicks: Pick[];
  myUserId: string;
}) {
  const router = useRouter();
  const [picks, setPicks] = useState<Pick[]>(initialPicks);
  const [busy, setBusy] = useState<string | null>(null);

  // Live updates: refresh picks whenever anyone on the team changes theirs.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("trip-picks-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_picks" },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Keep local state in sync when the server refreshes.
  useEffect(() => setPicks(initialPicks), [initialPicks]);

  function myPick(woId: string) {
    return picks.find((p) => p.work_order_id === woId && p.user_id === myUserId)
      ?.pick;
  }
  function teamPicks(woId: string) {
    return picks.filter(
      (p) => p.work_order_id === woId && p.user_id !== myUserId
    );
  }

  async function pick(id: string, value: "yes" | "no" | "maybe") {
    setPicks((prev) => [
      ...prev.filter(
        (p) => !(p.work_order_id === id && p.user_id === myUserId)
      ),
      { work_order_id: id, user_id: myUserId, pick: value, name: "You" },
    ]);
    setBusy(id);
    await setTripPick(id, value);
    setBusy(null);
  }

  async function resetPicks() {
    setPicks((prev) => prev.filter((p) => p.user_id !== myUserId));
    await clearTripPicks(state);
  }

  const counts = useMemo(() => {
    const mine = picks.filter((p) => p.user_id === myUserId);
    return {
      yes: mine.filter((p) => p.pick === "yes").length,
      maybe: mine.filter((p) => p.pick === "maybe").length,
      no: mine.filter((p) => p.pick === "no").length,
    };
  }, [picks, myUserId]);

  return (
    <>
      <TripMap
        orders={orders.map((o) => ({
          ...o,
          trip_pick: myPick(o.id) ?? null,
        }))}
      />

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="text-sm font-semibold text-[#0e1726]">
          {orders.length} open in {state} · your picks:{" "}
          <span className="text-[#1f9d63]">{counts.yes} yes</span> ·{" "}
          <span className="text-[#b9700f]">{counts.maybe} maybe</span> ·{" "}
          <span className="text-[#d24b4b]">{counts.no} no</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetPicks}
            className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] text-[#0e1726] font-semibold rounded-lg px-4 py-2 text-sm transition"
          >
            Reset my picks
          </button>
          <Link
            href={`/app/work-orders/trip/print?state=${state}`}
            className={`font-semibold rounded-lg px-4 py-2 text-sm transition ${
              counts.yes + counts.maybe > 0
                ? "bg-[#ff8a1e] hover:bg-[#ffa347] text-white"
                : "bg-[#eef1f6] text-[#5a6b85] pointer-events-none"
            }`}
          >
            🖨 Print my trip sheet ({counts.yes + counts.maybe})
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {orders.map((wo) => {
          const current = myPick(wo.id);
          const others = teamPicks(wo.id);
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
                  {others.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {others.map((p) => (
                        <span
                          key={p.user_id}
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            PICK_CHIP[p.pick] ?? PICK_CHIP.no
                          }`}
                          title={`${p.name}: ${p.pick}`}
                        >
                          {p.name}: {p.pick}
                        </span>
                      ))}
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
