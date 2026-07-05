import { NextResponse } from "next/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

// Stripe calls this after checkout completes; we record the payment and
// update the invoice status. Requires STRIPE_WEBHOOK_SECRET and
// SUPABASE_SERVICE_ROLE_KEY.
export async function POST(req: Request) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET)
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  if (!adminConfigured())
    return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature)
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const stripe = getStripe();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const invoiceId = session.metadata?.invoice_id;
    const amount = (session.amount_total ?? 0) / 100;

    if (invoiceId && amount > 0) {
      const admin = createAdminClient();

      // Idempotency: skip if this session was already recorded.
      const { data: existing } = await admin
        .from("payments")
        .select("id")
        .eq("stripe_payment_intent_id", String(session.payment_intent))
        .maybeSingle();

      if (!existing) {
        await admin.from("payments").insert({
          invoice_id: invoiceId,
          amount,
          method: "card",
          stripe_payment_intent_id: String(session.payment_intent),
        });

        // Recompute invoice status.
        const { data: inv } = await admin
          .from("invoices")
          .select("tax_rate, line_items(quantity, unit_price), payments(amount)")
          .eq("id", invoiceId)
          .single();
        if (inv) {
          const sub = (inv.line_items ?? []).reduce(
            (s: number, i: { quantity: number; unit_price: number }) =>
              s + Number(i.quantity) * Number(i.unit_price),
            0
          );
          const total = sub * (1 + Number(inv.tax_rate));
          const paid = (inv.payments ?? []).reduce(
            (s: number, p: { amount: number }) => s + Number(p.amount),
            0
          );
          await admin
            .from("invoices")
            .update({ status: paid >= total - 0.005 ? "paid" : "partially_paid" })
            .eq("id", invoiceId);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
