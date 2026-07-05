"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function PrintControls({ currentDays }: { currentDays: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between mb-6 print:hidden">
      <div className="flex items-center gap-2">
        <Link
          href="/app/dev/pump"
          className="text-sm text-[#5a6b85] hover:text-[#b9700f] mr-2"
        >
          ← Back
        </Link>
        <span className="text-sm font-semibold">Show:</span>
        {[
          ["7", "This week"],
          ["14", "2 weeks"],
          ["30", "30 days"],
          ["60", "60 days"],
          ["all", "All sites"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => router.push(`/app/dev/pump/print?days=${value}`)}
            className={`text-sm font-semibold rounded-lg px-3 py-1.5 border transition ${
              currentDays === value
                ? "bg-[#0e1f38] text-white border-[#0e1f38]"
                : "bg-white text-[#0e1726] border-[#e4e9f1] hover:border-[#ff8a1e]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        onClick={() => window.print()}
        className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2 transition"
      >
        🖨 Print
      </button>
    </div>
  );
}
