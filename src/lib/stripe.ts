import Stripe from "stripe";

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}
