export type PumpSite = {
  id: string;
  client_name: string;
  site_label: string | null;
  address: string;
  interval_months: number;
  window_days: number;
  last_pumped: string | null;
  notes: string | null;
  is_active: boolean;
};

export type Projection = {
  nextDue: Date | null;
  windowStart: Date | null;
  windowEnd: Date | null;
  daysUntil: number | null;
  overdue: boolean;
};

export function projectNext(site: PumpSite, today = new Date()): Projection {
  if (!site.last_pumped)
    return {
      nextDue: null,
      windowStart: null,
      windowEnd: null,
      daysUntil: null,
      overdue: false,
    };
  const next = new Date(site.last_pumped + "T00:00:00");
  next.setMonth(next.getMonth() + site.interval_months);
  const start = new Date(next);
  start.setDate(start.getDate() - site.window_days);
  const end = new Date(next);
  end.setDate(end.getDate() + site.window_days);
  const daysUntil = Math.ceil(
    (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  return {
    nextDue: next,
    windowStart: start,
    windowEnd: end,
    daysUntil,
    overdue: daysUntil < 0,
  };
}

export function fmtDate(d: Date | null) {
  return d
    ? d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
}

export function isoDate(d: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "";
}
