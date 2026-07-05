import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DevPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (me?.role !== "owner") redirect("/app");

  const { data: leads } = await supabase.from("leads").select("status");
  const total = leads?.length ?? 0;
  const converted = (leads ?? []).filter((l) => l.status === "converted").length;
  const contacted = (leads ?? []).filter((l) =>
    ["contacted", "converted", "closed"].includes(l.status)
  ).length;
  const rate = total ? Math.round((converted / total) * 100) : 0;

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726] mb-2">
        Under Development
      </h1>
      <p className="text-[#5a6b85] mb-8">
        Owner-only experiments and internal tools.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-[#0e1726] mb-1">
            Sales vs Marketing conversion
          </h2>
          <p className="text-sm text-[#5a6b85] mb-5">
            How website leads move through the pipeline.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Website leads" value={String(total)} />
            <Stat label="Contacted" value={String(contacted)} />
            <Stat label="Converted to customers" value={String(converted)} />
            <Stat label="Conversion rate" value={`${rate}%`} accent />
          </div>
        </div>

        <Link
          href="/app/dev/pump"
          className="bg-white rounded-2xl border border-[#e4e9f1] p-6 shadow-sm hover:border-[#ff8a1e] transition block"
        >
          <h2 className="text-lg font-extrabold text-[#0e1726] mb-1">
            Pump Route Scheduler →
          </h2>
          <p className="text-sm text-[#5a6b85]">
            Preventative pump-out scheduling: client sites, service intervals,
            projected date ranges, and CSV export for customer distribution.
          </p>
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-xs font-bold tracking-wider text-[#5a6b85] uppercase mb-1">
        {label}
      </div>
      <div
        className={`text-2xl font-extrabold ${
          accent ? "text-[#ff8a1e]" : "text-[#0e1726]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
