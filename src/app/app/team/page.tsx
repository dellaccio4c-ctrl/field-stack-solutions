import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_RANK, type UserRole } from "@/lib/roles";
import { TeamManager } from "./team-manager";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const myRole = (me?.role ?? "readonly") as UserRole;
  if (ROLE_RANK[myRole] < 4) redirect("/app");

  const { data: members } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, is_active, created_at, employee_code, job_title, phone, territory, hire_date, notes, legal_first_name, legal_last_name, preferred_name"
    )
    .neq("role", "customer")
    .order("created_at");

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726] mb-2">
        Team
      </h1>
      <p className="text-[#5a6b85] mb-6">
        Access levels: Owner &gt; Admin &gt; Manager &gt; Tech/Field &gt;
        Read-only. Nobody can raise their own level — only someone above them
        can. These rules are enforced by the database itself.
      </p>
      <TeamManager
        members={members ?? []}
        myId={user!.id}
        myRole={myRole}
      />
    </div>
  );
}
