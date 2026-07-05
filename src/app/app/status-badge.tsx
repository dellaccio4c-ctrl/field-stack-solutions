const STYLES: Record<string, string> = {
  draft: "bg-[#eef1f6] text-[#5a6b85]",
  sent: "bg-[#e8f0fd] text-[#2f6fd6]",
  approved: "bg-[#e3f6ec] text-[#1f9d63]",
  declined: "bg-[#fbe7e7] text-[#d24b4b]",
  expired: "bg-[#eef1f6] text-[#5a6b85]",
  partially_paid: "bg-[#fff2e3] text-[#b9700f]",
  paid: "bg-[#e3f6ec] text-[#1f9d63]",
  void: "bg-[#eef1f6] text-[#5a6b85]",
  overdue: "bg-[#fbe7e7] text-[#d24b4b]",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
        STYLES[status] ?? STYLES.draft
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
