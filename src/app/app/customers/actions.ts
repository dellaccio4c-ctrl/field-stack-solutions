"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    name: String(formData.get("name") ?? "").trim(),
    contact_name: String(formData.get("contact_name") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    billing_address: String(formData.get("billing_address") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/app/customers");
  return { error: null };
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      contact_name: String(formData.get("contact_name") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      billing_address: String(formData.get("billing_address") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/customers");
  revalidatePath(`/app/customers/${id}`);
  return { error: null };
}

export async function createLocation(customerId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("locations").insert({
    customer_id: customerId,
    label: String(formData.get("label") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim() || null,
    state: String(formData.get("state") ?? "").trim() || null,
    zip: String(formData.get("zip") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/app/customers/${customerId}`);
  return { error: null };
}

export async function createCustomerLogin(
  customerId: string,
  formData: FormData
) {
  const { adminConfigured, createAdminClient } = await import(
    "@/lib/supabase/admin"
  );
  if (!adminConfigured()) {
    return {
      error:
        "Customer logins aren't configured yet. Add SUPABASE_SERVICE_ROLE_KEY to the environment.",
      tempPassword: null,
    };
  }

  // Only admins and owners may create customer portal accounts.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (!me || !["admin", "owner"].includes(me.role))
    return {
      error: "Only Admins and Owners can create customer logins.",
      tempPassword: null,
    };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!email) return { error: "Email is required.", inviteLink: null, emailed: false };

  const { headers } = await import("next/headers");
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  const admin = createAdminClient();
  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: { full_name: fullName },
        redirectTo: `${origin}/auth/callback?next=/welcome`,
      },
    });
  if (linkErr) return { error: linkErr.message, inviteLink: null, emailed: false };

  const { error: profErr } = await admin
    .from("profiles")
    .update({ role: "customer", customer_id: customerId, full_name: fullName })
    .eq("id", linkData.user.id);
  if (profErr) return { error: profErr.message, inviteLink: null, emailed: false };

  const { sendWelcomeEmail, emailConfigured } = await import("@/lib/email");
  let emailed = false;
  if (emailConfigured()) {
    const result = await sendWelcomeEmail({
      to: email,
      name: fullName,
      link: linkData.properties.action_link,
      isCustomer: true,
    });
    emailed = !result.error;
  }

  revalidatePath(`/app/customers/${customerId}`);
  return { error: null, inviteLink: linkData.properties.action_link, emailed };
}

export async function deleteLocation(customerId: string, locationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("locations")
    .delete()
    .eq("id", locationId);
  if (error) return { error: error.message };
  revalidatePath(`/app/customers/${customerId}`);
  return { error: null };
}
