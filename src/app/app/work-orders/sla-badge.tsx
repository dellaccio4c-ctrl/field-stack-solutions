import { slaState, fmtHours } from "@/lib/sla";

const STYLES: Record<string, string> = {
  met: "bg-[#e3f6ec] text-[#1f9d63]",
  on_track: "bg-[#eef1f6] text-[#5a6b85]",
  at_risk: "bg-[#fff2e3] text-[#b9700f]",
  breached: "bg-[#fbe7e7] text-[#d24b4b]",
};

export function SlaBadge({
  wo,
}: {
  wo: {
    priority: string;
    status: string;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
  };
}) {
  const sla = slaState(wo);
  if (!sla) return null;

  const label =
    sla.status === "met"
      ? `SLA met (${fmtHours(sla.targetHours - sla.hoursLeft)} of ${fmtHours(sla.targetHours)})`
      : sla.status === "breached"
        ? wo.status === "completed"
          ? `SLA missed by ${fmtHours(sla.hoursLeft)}`
          : `SLA breached ${fmtHours(sla.hoursLeft)} ago`
        : `${sla.kind === "response" ? "Respond" : "Resolve"} in ${fmtHours(sla.hoursLeft)}`;

  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${STYLES[sla.status]}`}
      title={`${sla.kind} target: ${fmtHours(sla.targetHours)} for ${wo.priority} priority`}
    >
      ⏱ {label}
    </span>
  );
}
