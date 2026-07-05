import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL, type UserRole } from "@/lib/roles";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user!.id)
    .single();

  const role = (profile?.role ?? "readonly") as UserRole;

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726] mb-2">
        Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
      </h1>
      <p className="text-[#5a6b85] mb-8">
        Signed in as <b>{ROLE_LABEL[role]}</b>. Estimating, invoicing, and
        reporting modules are coming online in the next build phases.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          ["Estimates", "Create and send estimates — Phase 2"],
          ["Invoices", "Bill customers and track status — Phase 2"],
          ["Payments", "Stripe online payments — Phase 3"],
          ["Owner Financials", "Revenue, receivables, exports — Phase 3"],
          ["Customer Portal", "Customer self-service — Phase 4"],
          ["Pump Route Scheduler", "Routing & projections — Phase 5"],
        ].map(([title, desc]) => (
          <div
            key={title}
            className="bg-white rounded-2xl border border-[#e4e9f1] p-5 shadow-sm"
          >
            <div className="font-bold text-[#0e1726] mb-1">{title}</div>
            <div className="text-sm text-[#5a6b85]">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
