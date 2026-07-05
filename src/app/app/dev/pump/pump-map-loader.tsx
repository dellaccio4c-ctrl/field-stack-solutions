"use client";

import dynamic from "next/dynamic";
import type { PumpSite } from "@/lib/pump";

// Leaflet touches `window` at import time, so load it client-side only.
const PumpMap = dynamic(() => import("./pump-map"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-[#e4e9f1] bg-white flex items-center justify-center text-[#5a6b85] text-sm mb-6" style={{ height: 380 }}>
      Loading map…
    </div>
  ),
});

export function PumpMapLoader({ sites }: { sites: PumpSite[] }) {
  return <PumpMap sites={sites} />;
}
