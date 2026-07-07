"use client";

import { useState } from "react";
import Link from "next/link";
import { dispatchWorkOrder } from "./actions";

type Wo = {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  wo_type: string;
  assigned_to: string | null;
  scheduled_date: string | null;
  customer: string | null;
  site: string | null;
};

type Tech = { id: string; name: string };

const PRIORITY_DOT: Record<string, string> = {
  emergency: "#d24b4b",
  high: "#b9700f",
  normal: "#2f6fd6",
  low: "#8fa0ba",
};

const dayLabel = (isoDate: string) =>
  new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });

function Card({
  wo,
  onDragStart,
  onTap,
}: {
  wo: Wo;
  onDragStart: (e: React.DragEvent) => void;
  onTap: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onTap}
      className="bg-white border border-[#e4e9f1] rounded-lg px-2.5 py-2 mb-1.5 shadow-sm cursor-grab active:cursor-grabbing hover:border-[#ff8a1e] text-xs select-none"
      title={`${wo.title}${wo.customer ? ` — ${wo.customer}` : ""}`}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: PRIORITY_DOT[wo.priority] ?? PRIORITY_DOT.normal }}
        />
        <span className="font-bold">WO-{wo.number}</span>
        <span className="text-[#5a6b85] truncate">{wo.title}</span>
      </div>
      {(wo.customer || wo.site) && (
        <div className="text-[#5a6b85] truncate mt-0.5">
          {wo.customer}
          {wo.site ? ` — ${wo.site}` : ""}
        </div>
      )}
    </div>
  );
}

export function DispatchBoard({
  days,
  techs,
  scheduled,
  backlog,
}: {
  days: string[];
  techs: Tech[];
  scheduled: Wo[];
  backlog: Wo[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignWo, setAssignWo] = useState<Wo | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const cellKey = (techId: string | null, day: string | null) =>
    `${techId ?? "un"}|${day ?? "backlog"}`;

  async function move(woId: string, techId: string | null, day: string | null) {
    setBusy(true);
    setError(null);
    const res = await dispatchWorkOrder(woId, techId, day);
    setBusy(false);
    if (res.error) setError(res.error);
  }

  function dropHandlers(techId: string | null, day: string | null) {
    const key = cellKey(techId, day);
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(key);
      },
      onDragLeave: () => setDragOver((k) => (k === key ? null : k)),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(null);
        const woId = e.dataTransfer.getData("text/wo");
        if (woId) move(woId, techId, day);
      },
    };
  }

  const dragStart = (wo: Wo) => (e: React.DragEvent) => {
    e.dataTransfer.setData("text/wo", wo.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const inCell = (techId: string | null, day: string) =>
    scheduled.filter((w) => w.scheduled_date === day && (w.assigned_to ?? null) === techId);

  return (
    <div>
      {error && (
        <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2 mb-3">{error}</div>
      )}
      {busy && <div className="text-xs text-[#5a6b85] mb-2">Saving…</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        {/* Backlog */}
        <div
          {...dropHandlers(null, null)}
          className={`bg-white rounded-2xl border p-3 shadow-sm h-fit ${
            dragOver === cellKey(null, null) ? "border-[#ff8a1e] bg-[#fff8f0]" : "border-[#e4e9f1]"
          }`}
        >
          <div className="text-xs font-bold tracking-wider uppercase text-[#5a6b85] mb-2">
            Backlog — unscheduled ({backlog.length})
          </div>
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            {backlog.length === 0 && (
              <div className="text-xs text-[#5a6b85] py-4 text-center">
                Nothing unscheduled 🎉
              </div>
            )}
            {backlog.map((wo) => (
              <Card key={wo.id} wo={wo} onDragStart={dragStart(wo)} onTap={() => setAssignWo(wo)} />
            ))}
          </div>
        </div>

        {/* Week grid */}
        <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
          <table className="w-full text-sm border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th className="text-left px-3 py-2.5 text-xs font-bold tracking-wider uppercase text-[#5a6b85] border-b border-[#e4e9f1] w-32">
                  Tech
                </th>
                {days.map((d) => (
                  <th
                    key={d}
                    className={`text-left px-2 py-2.5 text-xs font-bold border-b border-[#e4e9f1] ${
                      d === today ? "text-[#b9700f]" : "text-[#5a6b85]"
                    }`}
                  >
                    {dayLabel(d)}
                    {d === today ? " · today" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Unassigned-but-scheduled row */}
              <tr>
                <td className="px-3 py-2 font-semibold text-[#5a6b85] border-b border-[#e4e9f1] align-top text-xs">
                  Unassigned
                </td>
                {days.map((d) => (
                  <td
                    key={d}
                    {...dropHandlers(null, d)}
                    className={`px-1.5 py-2 border-b border-l border-[#e4e9f1] align-top min-w-28 ${
                      dragOver === cellKey(null, d) ? "bg-[#fff8f0]" : d === today ? "bg-[#fffcf7]" : ""
                    }`}
                  >
                    {inCell(null, d).map((wo) => (
                      <Card key={wo.id} wo={wo} onDragStart={dragStart(wo)} onTap={() => setAssignWo(wo)} />
                    ))}
                  </td>
                ))}
              </tr>
              {techs.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2 font-semibold border-b border-[#e4e9f1] align-top">
                    {t.name}
                  </td>
                  {days.map((d) => (
                    <td
                      key={d}
                      {...dropHandlers(t.id, d)}
                      className={`px-1.5 py-2 border-b border-l border-[#e4e9f1] align-top min-w-28 ${
                        dragOver === cellKey(t.id, d) ? "bg-[#fff8f0]" : d === today ? "bg-[#fffcf7]" : ""
                      }`}
                    >
                      {inCell(t.id, d).map((wo) => (
                        <Card key={wo.id} wo={wo} onDragStart={dragStart(wo)} onTap={() => setAssignWo(wo)} />
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tap-to-assign (mobile friendly) */}
      {assignWo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-extrabold text-[#0e1726] mb-1">
              WO-{assignWo.number} · {assignWo.title}
            </h2>
            <p className="text-xs text-[#5a6b85] mb-4">
              {assignWo.customer ?? ""}
              {assignWo.site ? ` — ${assignWo.site}` : ""}
            </p>
            <form
              action={async (fd: FormData) => {
                const tech = String(fd.get("tech") ?? "") || null;
                const day = String(fd.get("day") ?? "") || null;
                await move(assignWo.id, tech, day);
                setAssignWo(null);
              }}
              className="space-y-3"
            >
              <label className="block text-xs font-semibold text-[#5a6b85]">
                Tech
                <select
                  name="tech"
                  defaultValue={assignWo.assigned_to ?? ""}
                  className="block mt-1 w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 text-sm bg-white font-normal text-[#0e1726]"
                >
                  <option value="">Unassigned</option>
                  {techs.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-[#5a6b85]">
                Day
                <select
                  name="day"
                  defaultValue={assignWo.scheduled_date ?? ""}
                  className="block mt-1 w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 text-sm bg-white font-normal text-[#0e1726]"
                >
                  <option value="">Backlog (unscheduled)</option>
                  {days.map((d) => (
                    <option key={d} value={d}>{dayLabel(d)}</option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-2.5 text-sm transition"
                >
                  Save
                </button>
                <Link
                  href={`/app/work-orders/${assignWo.id}`}
                  className="px-4 py-2.5 border border-[#e4e9f1] rounded-lg font-semibold text-sm text-[#0e1726] hover:border-[#ff8a1e]"
                >
                  Open WO
                </Link>
                <button
                  type="button"
                  onClick={() => setAssignWo(null)}
                  className="px-4 py-2.5 border border-[#e4e9f1] rounded-lg font-semibold text-sm text-[#0e1726] hover:border-[#ff8a1e]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
