import { NextResponse } from "next/server";
import { generatePmWorkOrders } from "@/lib/pm-generator";
import { adminConfigured } from "@/lib/supabase/admin";

// Runs daily via Vercel Cron (see vercel.json). Protected by CRON_SECRET:
// Vercel sends "Authorization: Bearer <CRON_SECRET>" automatically.
export async function GET(req: Request) {
  if (!adminConfigured())
    return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await generatePmWorkOrders();
  return NextResponse.json(result);
}
