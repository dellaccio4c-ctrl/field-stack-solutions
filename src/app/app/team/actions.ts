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
      tempPassword: null,
    };
  }

  const rank = await actorRank();
  const role = String(formData.get("role") || "readonly") as UserRole;
  if (rank < 4)
    return { error: "Only Admins and Owners can add team members.", tempPassword: null };
  if (ROLE_RANK[role] >= rank)
    return {
      error: "You can only assign roles below your own access level.",
      tempPassword: null,
    };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!email) return { error: "Email is required.", tempPassword: null };

  // Random temporary password shown once to the admin.
  const tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(9)))
    .map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"[b % 55])
    .join("");

  const admin = createAdminClient();
  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
  if (createErr) return { error: createErr.message, tempPassword: null };

  // Profile row is created by DB trigger; set the assigned role via admin
  // client (service role bypasses the self-change trigger safely — rank was
  // validated above).
  const { error: roleErr } = await admin
    .from("profiles")
    .update({ role, full_name: fullName })
    .eq("id", created.user.id);
  if (roleErr) return { error: roleErr.message, tempPassword: null };

  revalidatePath("/app/team");
  return { error: null, tempPassword };
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
