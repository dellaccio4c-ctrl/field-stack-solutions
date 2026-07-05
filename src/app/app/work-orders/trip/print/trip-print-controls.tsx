"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function TripPrintControls({
  state,
  includeMaybe,
}: {
  state: string;
  includeMaybe: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between mb-6 print:hidden">
      <div className="flex items-center gap-2">
        <Link
          href={`/app/work-orders/trip?state=${state}`}
          className="text-sm text-[#5a6b85] hover:text-[#b9700f] mr-2"
        >
          ← Back to planner
        </Link>
        <button
          onClick={() =>
            router.push(`/app/work-orders/trip/print?state=${state}`)
          }
          className={`text-sm font-semibold rounded-lg px-3 py-1.5 border transition ${
            includeMaybe
              ? "bg-[#0e1f38] text-white border-[#0e1f38]"
              : "bg-white text-[#0e1726] border-[#e4e9f1] hover:border-[#ff8a1e]"
          }`}
        >
          Yes + Maybe
        </button>
        <button
          onClick={() =>
            router.push(
              `/app/work-orders/trip/print?state=${state}&include=yes-only`
            )
          }
          className={`text-sm font-semibold rounded-lg px-3 py-1.5 border transition ${
            !includeMaybe
              ? "bg-[#0e1f38] text-white border-[#0e1f38]"
              : "bg-white text-[#0e1726] border-[#e4e9f1] hover:border-[#ff8a1e]"
          }`}
        >
          Yes only
        </button>
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
