import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL, type UserRole } from "@/lib/roles";
import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, email, role, employee_code, job_title, phone, territory, hire_date, preferred_name, personal_email"
    )
    .eq("id", user!.id)
    .single();

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726] mb-6">
        My Account
      </h1>

      <div className="bg-white rounded-2xl border border-[#e4e9f1] p-6 shadow-sm mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs font-bold tracking-wider text-[#5a6b85] uppercase mb-1">
              Name
            </div>
            <div className="font-semibold">{profile?.full_name || "—"}</div>
          </div>
          <div>
            <div className="text-xs font-bold tracking-wider text-[#5a6b85] uppercase mb-1">
              Email
            </div>
            <div className="font-semibold">{profile?.email || user!.email}</div>
          </div>
          <div>
            <div className="text-xs font-bold tracking-wider text-[#5a6b85] uppercase mb-1">
              Access level
            </div>
            <div className="font-semibold">
              {ROLE_LABEL[(profile?.role ?? "readonly") as UserRole]}
            </div>
          </div>
          {profile?.employee_code && (
            <div>
              <div className="text-xs font-bold tracking-wider text-[#5a6b85] uppercase mb-1">
                Employee code
              </div>
              <div className="font-semibold">{profile.employee_code}</div>
            </div>
          )}
          {profile?.job_title && (
            <div>
              <div className="text-xs font-bold tracking-wider text-[#5a6b85] uppercase mb-1">
                Job title
              </div>
              <div className="font-semibold">{profile.job_title}</div>
            </div>
          )}
          {profile?.territory && (
            <div>
              <div className="text-xs font-bold tracking-wider text-[#5a6b85] uppercase mb-1">
                Territory
              </div>
              <div className="font-semibold">{profile.territory}</div>
            </div>
          )}
          {profile?.hire_date && (
            <div>
              <div className="text-xs font-bold tracking-wider text-[#5a6b85] uppercase mb-1">
                Hire date
              </div>
              <div className="font-semibold">{profile.hire_date}</div>
            </div>
          )}
        </div>
      </div>

      <ProfileForm
        defaults={{
          preferred_name: profile?.preferred_name ?? "",
          phone: profile?.phone ?? "",
          personal_email: profile?.personal_email ?? "",
        }}
      />

      <PasswordForm />
    </div>
  );
}
