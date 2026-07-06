"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveNotifyPrefs(prefs: Record<string, boolean>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Only known keys, only booleans — nothing else lands in the column.
  const allowed = [
    "wo_assigned",
    "site_closures",
    "incident_claims",
    "estimate_approvals",
    "payment_received",
  ];
  const clean: Record<string, boolean> = {};
  for (const k of allowed) clean[k] = prefs[k] === true;

  const { error } = await supabase
    .from("profiles")
    .update({ notify_prefs: clean })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/app/account");
  return { error: null };
}
