// SLA targets per work-order priority. Response = created → work started;
// resolution = created → completed. Hours.
export const SLA_TARGETS: Record<
  string,
  { responseHours: number; resolutionHours: number }
> = {
  emergency: { responseHours: 2, resolutionHours: 8 },
  high: { responseHours: 4, resolutionHours: 24 },
  normal: { responseHours: 24, resolutionHours: 72 },
  low: { responseHours: 72, resolutionHours: 168 },
};

export type SlaState = {
  kind: "response" | "resolution";
  status: "met" | "on_track" | "at_risk" | "breached";
  /** Hours remaining (negative = overdue by that much) */
  hoursLeft: number;
  targetHours: number;
};

function hoursBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / 36e5;
}

/**
 * Computes the current SLA state for a work order.
 * - Before work starts: measures the response clock.
 * - After start, before completion: measures the resolution clock.
 * - Completed/cancelled: reports whether targets were met (or null for cancelled).
 */
export function slaState(wo: {
  priority: string;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}): SlaState | null {
  const target = SLA_TARGETS[wo.priority] ?? SLA_TARGETS.normal;
  const created = new Date(wo.created_at);
  const now = new Date();

  if (wo.status === "cancelled") return null;

  if (wo.status === "completed") {
    if (!wo.completed_at) return null;
    const took = hoursBetween(created, new Date(wo.completed_at));
    return {
      kind: "resolution",
      status: took <= target.resolutionHours ? "met" : "breached",
      hoursLeft: target.resolutionHours - took,
      targetHours: target.resolutionHours,
    };
  }

  if (!wo.started_at) {
    // Response clock running
    const elapsed = hoursBetween(created, now);
    const left = target.responseHours - elapsed;
    return {
      kind: "response",
      status: left < 0 ? "breached" : left < target.responseHours * 0.25 ? "at_risk" : "on_track",
      hoursLeft: left,
      targetHours: target.responseHours,
    };
  }

  // Resolution clock running
  const elapsed = hoursBetween(created, now);
  const left = target.resolutionHours - elapsed;
  return {
    kind: "resolution",
    status: left < 0 ? "breached" : left < target.resolutionHours * 0.25 ? "at_risk" : "on_track",
    hoursLeft: left,
    targetHours: target.resolutionHours,
  };
}

export function fmtHours(h: number) {
  const abs = Math.abs(h);
  if (abs < 1) return `${Math.round(abs * 60)}m`;
  if (abs < 48) return `${Math.round(abs)}h`;
  return `${Math.round(abs / 24)}d`;
}
