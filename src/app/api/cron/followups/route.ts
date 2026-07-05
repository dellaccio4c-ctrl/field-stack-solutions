import { NextResponse } from "next/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";
import { emailConfigured, sendEstimateFollowUp } from "@/lib/email";
import { money, subtotal } from "@/lib/money";

// Follow-up schedule: days after sent_at for the 1st, 2nd, 3rd reminder.
// After the 3rd, we stop — no nagging.
const SCHEDULE_DAYS = [3, 7, 14];

export async function GET(req: Request) {
  if (!adminConfigured())
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  if (!emailConfigured())
    return NextResponse.json({ sent: 0, note: "Email not configured — skipping." });

  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: estimates } = await admin
    .from("estimates")
    .select(
      "id, number, title, status, sent_at, tax_rate, follow_up_count, last_follow_up_at, customers(name, email), line_items(quantity, unit_price)"
    )
    .eq("status", "sent")
    .not("sent_at", "is", null)
    .lt("follow_up_count", SCHEDULE_DAYS.length);

  let sent = 0;
  const errors: string[] = [];
  const now = Date.now();

  for (const est of estimates ?? []) {
    const dueDays = SCHEDULE_DAYS[est.follow_up_count];
    const sentAt = new Date(est.sent_at).getTime();
    if (now - sentAt < dueDays * 864e5) continue;

    // Don't send twice in one window if the cron re-runs.
    if (
      est.last_follow_up_at &&
      now - new Date(est.last_follow_up_at).getTime() < 2 * 864e5
    )
      continue;

    const customer = est.customers as unknown as {
      name: string;
      email: string | null;
    } | null;
    if (!customer?.email) continue;

    const total =
      subtotal(est.line_items ?? []) * (1 + Number(est.tax_rate));
    const number = `EST-${String(est.number).padStart(4, "0")}`;

    const result = await sendEstimateFollowUp({
      to: customer.email,
      customerName: customer.name,
      number,
      title: est.title,
      total: money(total),
      followUpNumber: est.follow_up_count + 1,
    });

    if (result.error) {
      errors.push(`${number}: ${result.error}`);
      continue;
    }

    await admin
      .from("estimates")
      .update({
        follow_up_count: est.follow_up_count + 1,
        last_follow_up_at: new Date().toISOString(),
      })
      .eq("id", est.id);
    sent++;
  }

  return NextResponse.json({ sent, errors });
}
