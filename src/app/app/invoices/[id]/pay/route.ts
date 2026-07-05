import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { subtotal } from "@/lib/money";

// Creates a Stripe Checkout session for the invoice's outstanding balance
// and redirects the payer there. Works for staff and for the customer's own
// invoices (RLS scopes the select).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!stripeConfigured())
    return NextResponse.json(
      { error: "Online payments are not configured yet." },
      { status: 503 }
    );

  const { id } = await params;
  const supabase = await createClient();

  const { data: inv } = await supabase
    .from("invoices")
    .select(
      "id, number, title, status, tax_rate, customers(name, email), line_items(quantity, unit_price), payments(amount)"
    )
    .eq("id", id)
    .single();

  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (["paid", "void", "draft"].includes(inv.status))
    return NextResponse.json(
      { error: "This invoice is not payable." },
      { status: 400 }
    );

  const total = subtotal(inv.line_items ?? []) * (1 + Number(inv.tax_rate));
  const paid = (inv.payments ?? []).reduce(
    (s: number, p: { amount: number }) => s + Number(p.amount),
    0
  );
  const balanceCents = Math.round(Math.max(0, total - paid) * 100);
  if (balanceCents < 50)
    return NextResponse.json(
      { error: "Balance is below the minimum chargeable amount." },
      { status: 400 }
    );

  const number = `INV-${String(inv.number).padStart(4, "0")}`;
  const origin = new URL(req.url).origin;
  const customer = inv.customers as unknown as {
    name: string;
    email: string | null;
  } | null;

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "us_bank_account"],
    customer_email: customer?.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${number} — ${inv.title || "Invoice"}`,
            description: customer?.name
              ? `Field Stack Solutions invoice for ${customer.name}`
              : undefined,
          },
          unit_amount: balanceCents,
        },
        quantity: 1,
      },
    ],
    metadata: { invoice_id: inv.id },
    success_url: `${origin}/app/invoices/${inv.id}?paid=1`,
    cancel_url: `${origin}/app/invoices/${inv.id}`,
  });

  return NextResponse.redirect(session.url!, 303);
}
