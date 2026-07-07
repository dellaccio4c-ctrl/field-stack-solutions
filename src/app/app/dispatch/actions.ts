"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Assign + schedule in one move (a drag on the dispatch board).
// techId null = back to unassigned; date null = back to the backlog.
export async function dispatchWorkOrder(
  woId: string,
  techId: string | null,
  date: string | null
) {
  const supabase = await createClient();

  const { data: before } = await supabase
    .from("work_orders")
    .select("assigned_to, status")
    .eq("id", woId)
    .single();

  const patch: Record<string, unknown> = {
    assigned_to: techId,
    scheduled_date: date,
  };
  // Keep status coherent with the board move.
  if (date && before?.status === "open") patch.status = "scheduled";
  if (!date && before?.status === "scheduled") patch.status = "open";

  const { error } = await supabase.from("work_orders").update(patch).eq("id", woId);
  if (error) return { error: error.message };

  // Notify the newly assigned tech if they opted in (best-effort).
  if (techId && techId !== before?.assigned_to) {
    try {
      const { emailConfigured, sendAlertEmail } = await import("@/lib/email");
      if (emailConfigured()) {
        const [{ data: assignee }, { data: wo }] = await Promise.all([
          supabase
            .from("profiles")
            .select("email, notify_prefs")
            .eq("id", techId)
            .single(),
          supabase
            .from("work_orders")
            .select("number, title, priority")
            .eq("id", woId)
            .single(),
        ]);
        if (
          assignee?.email &&
          (assignee.notify_prefs as Record<string, boolean>)?.wo_assigned &&
          wo
        ) {
          await sendAlertEmail({
            to: [assignee.email],
            subject: `Work order assigned to you: WO-${wo.number} — ${wo.title}`,
            bodyHtml: `<p><b>WO-${wo.number} · ${wo.title}</b> was scheduled to you${date ? ` for <b>${date}</b>` : ""}${wo.priority !== "normal" ? ` (priority: <b>${wo.priority}</b>)` : ""}.</p>`,
            link: `https://www.fieldstacksolutions.com/app/work-orders/${woId}`,
          });
        }
      }
    } catch {
      // assignment saved; alerting is best-effort
    }
  }

  revalidatePath("/app/dispatch");
  revalidatePath("/app/work-orders");
  return { error: null };
}
