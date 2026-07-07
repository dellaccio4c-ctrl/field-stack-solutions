"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function clockIn(workOrderId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: open } = await supabase
    .from("time_entries")
    .select("id")
    .eq("user_id", user.id)
    .is("clock_out", null)
    .limit(1);
  if (open?.length)
    return { error: "You're already clocked in — clock out first." };

  const { error } = await supabase.from("time_entries").insert({
    user_id: user.id,
    work_order_id: workOrderId,
  });
  if (error) return { error: error.message };
  revalidatePath("/app/time");
  return { error: null };
}

export async function clockOut(notes: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: open } = await supabase
    .from("time_entries")
    .select("id")
    .eq("user_id", user.id)
    .is("clock_out", null)
    .order("clock_in", { ascending: false })
    .limit(1);
  if (!open?.length) return { error: "You're not clocked in." };

  const { error } = await supabase
    .from("time_entries")
    .update({
      clock_out: new Date().toISOString(),
      notes: notes.trim() || null,
    })
    .eq("id", open[0].id);
  if (error) return { error: error.message };
  revalidatePath("/app/time");
  return { error: null };
}

// Manager+ correction of a specific entry (RLS enforces the rank).
export async function fixEntry(entryId: string, fd: FormData) {
  const supabase = await createClient();
  const clockIn = String(fd.get("clock_in") ?? "").trim();
  const clockOut = String(fd.get("clock_out") ?? "").trim();
  if (!clockIn) return { error: "Clock-in time is required." };
  const patch: Record<string, unknown> = {
    clock_in: new Date(clockIn).toISOString(),
    clock_out: clockOut ? new Date(clockOut).toISOString() : null,
    notes: String(fd.get("notes") ?? "").trim() || null,
  };
  const { error } = await supabase
    .from("time_entries")
    .update(patch)
    .eq("id", entryId);
  if (error) return { error: error.message };
  revalidatePath("/app/time");
  return { error: null };
}
