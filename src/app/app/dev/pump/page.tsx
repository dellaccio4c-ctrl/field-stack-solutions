import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_RANK, type UserRole } from "@/lib/roles";
import { PumpManager } from "./pump-manager";

export default async function PumpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  // Manager and up (so the pump operator can have a Manager account).
  if (!me || ROLE_RANK[me.role as UserRole] < 3) redirect("/app");

  const { data: sites } = await supabase
    .from("pump_sites")
    .select("*")
    .order("client_name");

  return (
    <div>
      <Link href="/app/dev" className="text-sm text-[#5a6b85] hover:text-[#b9700f]">
        ← Under Development
      </Link>
      <div className="flex items-center justify-between mt-2 mb-2 flex-wrap gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
          Pump Route Scheduler
        </h1>
        <a
          href="/app/dev/pump/export"
          className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] text-[#0e1726] font-semibold rounded-lg px-4 py-2 text-sm transition"
        >
          Export schedule CSV ⬇
        </a>
      </div>
      <p className="text-[#5a6b85] mb-6">
        Preventative pump-out scheduling. Each site&apos;s next service is
        projected from its last pump-out plus its interval, with a ± window you
        can quote to the customer.
      </p>
      <PumpManager sites={sites ?? []} />
    </div>
  );
}
