"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setLeadStatus(leadId: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId);
  if (error) return { error: error.message };
  revalidatePath("/app/leads");
  return { error: null };
}
