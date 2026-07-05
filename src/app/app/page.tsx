import { createClient } from "@/lib/supabase/server";
import { type UserRole } from "@/lib/roles";
import { CustomerDashboard } from "./customer-dashboard";
import { StaffDashboard } from "./staff-dashboard";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, customer_id, customers(name)")
    .eq("id", user!.id)
    .single();

  const role = (profile?.role ?? "readonly") as UserRole;

  if (role === "customer" && profile?.customer_id) {
    return (
      <CustomerDashboard
        customerId={profile.customer_id}
        customerName={
          (profile.customers as unknown as { name: string } | null)?.name ??
          profile.full_name ??
          ""
        }
      />
    );
  }

  return (
    <StaffDashboard
      role={role}
      displayName={
        (profile?.full_name ?? "").split(" ")[0] || user!.email || ""
      }
    />
  );
}
