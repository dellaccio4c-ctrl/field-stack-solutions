"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { ROLE_RANK, type UserRole } from "@/lib/roles";

async function actorRank(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return -1;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return data ? ROLE_RANK[data.role as UserRole] : -1;
}

export async function inviteUser(formData: FormData) {
  if (!adminConfigured()) {
    return {
      error:
        "User creation isn't configured yet. Add SUPABASE_SERVICE_ROLE_KEY to the environment (Supabase Dashboard → Project Settings → API keys → service_role).",
      inviteLink: null,
      emailed: false,
    };
  }

  const rank = await actorRank();
  const role = String(formData.get("role") || "readonly") as UserRole;
  if (rank < 4)
    return {
      error: "Only Admins and Owners can add team members.",
      inviteLink: null,
      emailed: false,
    };
  // Owners may assign any level (including co-Owner); Admins only below themselves.
  if (rank < 5 && ROLE_RANK[role] >= rank)
    return {
      error: "You can only assign roles below your own access level.",
      inviteLink: null,
      emailed: false,
    };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const legalFirst = String(formData.get("legal_first_name") ?? "").trim();
  const legalLast = String(formData.get("legal_last_name") ?? "").trim();
  const fullName = `${legalFirst} ${legalLast}`.trim();
  if (!email) return { error: "Email is required.", inviteLink: null, emailed: false };

  const { headers } = await import("next/headers");
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  const admin = createAdminClient();
  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: { full_name: fullName },
        redirectTo: `${origin}/auth/callback?next=/welcome`,
      },
    });
  if (linkErr) return { error: linkErr.message, inviteLink: null, emailed: false };

  // token_hash link verified server-side at /auth/confirm — works in any
  // browser (the ?code= flow fails for invitees who lack the PKCE cookie).
  const inviteUrl = `${origin}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=invite&next=/welcome`;

  const { error: roleErr } = await admin
    .from("profiles")
    .update({
      role,
      full_name: fullName,
      legal_first_name: legalFirst || null,
      legal_last_name: legalLast || null,
      employee_code:
        String(formData.get("employee_code") ?? "").trim() || null,
    })
    .eq("id", linkData.user.id);
  if (roleErr) return { error: roleErr.message, inviteLink: null, emailed: false };

  // Send the branded welcome email if email is configured;
  // otherwise hand the link back for the admin to share manually.
  const { sendWelcomeEmail, emailConfigured } = await import("@/lib/email");
  let emailed = false;
  if (emailConfigured()) {
    const result = await sendWelcomeEmail({
      to: email,
      name: legalFirst || fullName,
      link: inviteUrl,
    });
    emailed = !result.error;
  }

  revalidatePath("/app/team");
  return { error: null, inviteLink: inviteUrl, emailed };
}

export async function changeRole(userId: string, role: UserRole) {
  // Regular client — the database trigger enforces the ladder rules
  // (no self-change, only higher ranks can promote/demote).
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/app/team");
  return { error: null };
}

export async function updateEmployee(userId: string, formData: FormData) {
  const rank = await actorRank();
  if (rank < 4)
    return { error: "Only Admins and Owners can edit employee records." };

  const legalFirst = String(formData.get("legal_first_name") ?? "").trim();
  const legalLast = String(formData.get("legal_last_name") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      legal_first_name: legalFirst || null,
      legal_last_name: legalLast || null,
      full_name: `${legalFirst} ${legalLast}`.trim(),
      employee_code: String(formData.get("employee_code") ?? "").trim() || null,
      job_title: String(formData.get("job_title") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      territory: String(formData.get("territory") ?? "").trim() || null,
      hire_date: String(formData.get("hire_date") || "") || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      hourly_cost: formData.get("hourly_cost")
        ? parseFloat(String(formData.get("hourly_cost"))) || null
        : null,
    })
    .eq("id", userId);
  if (error) {
    if (error.message.includes("profiles_employee_code_unique"))
      return { error: "That employee code is already in use." };
    return { error: error.message };
  }
  revalidatePath("/app/team");
  return { error: null };
}

export async function setActive(userId: string, isActive: boolean) {
  const rank = await actorRank();
  if (rank < 4) return { error: "Only Admins and Owners can deactivate users." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId)
    return { error: "You cannot deactivate your own account." };

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/app/team");
  return { error: null };
}
