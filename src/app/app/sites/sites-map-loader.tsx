"use client";

import dynamic from "next/dynamic";
import type { SiteRow } from "./sites-map";

const SitesMap = dynamic(() => import("./sites-map"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-2xl border border-[#e4e9f1] bg-white flex items-center justify-center text-[#5a6b85] text-sm mb-6"
      style={{ height: 360 }}
    >
      Loading map…
    </div>
  ),
});

export function SitesMapLoader({ sites }: { sites: SiteRow[] }) {
  return <SitesMap sites={sites} />;
}
