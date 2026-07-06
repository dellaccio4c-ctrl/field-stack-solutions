"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function geocode(address: string) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(address)}`,
      { headers: { "User-Agent": "FieldStackSolutions/1.0 (info@fieldstacksolutions.com)" } }
    );
    if (!res.ok) return null;
    const results = (await res.json()) as { lat: string; lon: string }[];
    if (!results.length) return null;
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

export async function createWorkOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const locationId = String(formData.get("location_id") ?? "");
  let address = String(formData.get("address") ?? "").trim();
  let city = String(formData.get("city") ?? "").trim();
  let state = String(formData.get("state") ?? "").trim().toUpperCase();
  let zip = String(formData.get("zip") ?? "").trim();

  // If a saved site was chosen, its address wins.
  if (locationId) {
    const { data: loc } = await supabase
      .from("locations")
      .select("address, city, state, zip")
      .eq("id", locationId)
      .single();
    if (loc) {
      address = loc.address ?? address;
      city = loc.city ?? city;
      state = (loc.state ?? state).toUpperCase();
      zip = loc.zip ?? zip;
    }
  }

  const fullAddress = [address, city, state, zip].filter(Boolean).join(", ");
  const coords = fullAddress ? await geocode(fullAddress) : null;

  const { data, error } = await supabase
    .from("work_orders")
    .insert({
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      priority: String(formData.get("priority") || "normal"),
      wo_type: String(formData.get("wo_type") || "service"),
      is_pumping: String(formData.get("wo_type")) === "pumping",
      customer_id: String(formData.get("customer_id") ?? "") || null,
      location_id: locationId || null,
      address: address || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      assigned_to: String(formData.get("assigned_to") ?? "") || null,
      scheduled_date: String(formData.get("scheduled_date") || "") || null,
      equipment_id: String(formData.get("equipment_id") ?? "") || null,
      created_by: user!.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  redirect(`/app/work-orders/${data.id}`);
}

export async function setWorkOrderStatus(
  id: string,
  status: string,
  minutesOnSite?: number
) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "completed" && minutesOnSite && minutesOnSite > 0) {
    patch.minutes_on_site = Math.round(minutesOnSite);
  }
  const { error } = await supabase.from("work_orders").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/app/work-orders/${id}`);
  revalidatePath("/app/work-orders");
  return { error: null };
}

export async function assignWorkOrder(id: string, userId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("work_orders")
    .update({ assigned_to: userId })
    .eq("id", id);
  if (error) return { error: error.message };

  // Email the assignee if they've opted in (best-effort).
  if (userId) {
    try {
      const { emailConfigured, sendAlertEmail } = await import("@/lib/email");
      if (emailConfigured()) {
        const [{ data: assignee }, { data: wo }] = await Promise.all([
          supabase
            .from("profiles")
            .select("email, notify_prefs")
            .eq("id", userId)
            .single(),
          supabase
            .from("work_orders")
            .select("number, title, priority")
            .eq("id", id)
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
            bodyHtml: `<p><b>WO-${wo.number} · ${wo.title}</b> was just assigned to you${wo.priority !== "normal" ? ` (priority: <b>${wo.priority}</b>)` : ""}.</p>`,
            link: `https://www.fieldstacksolutions.com/app/work-orders/${id}`,
          });
        }
      }
    } catch {
      // assignment already saved; alerting is best-effort
    }
  }

  revalidatePath(`/app/work-orders/${id}`);
  revalidatePath("/app/work-orders");
  return { error: null };
}

export async function scheduleWorkOrder(id: string, formData: FormData) {
  const supabase = await createClient();
  const start = String(formData.get("scheduled_date") || "") || null;
  const end = String(formData.get("scheduled_end") || "") || null;
  const patch: Record<string, unknown> = {
    scheduled_date: start,
    scheduled_end: end,
  };
  const { data: current } = await supabase
    .from("work_orders")
    .select("status")
    .eq("id", id)
    .single();
  if (start && current?.status === "open") patch.status = "scheduled";

  const { error } = await supabase.from("work_orders").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/app/work-orders/${id}`);
  revalidatePath("/app/work-orders");
  return { error: null };
}

export async function addWorkOrderNote(id: string, note: string) {
  const trimmed = note.trim();
  if (!trimmed) return { error: "Note is empty." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("work_order_events").insert({
    work_order_id: id,
    actor: user!.id,
    kind: "note",
    detail: trimmed.slice(0, 2000),
  });
  if (error) return { error: error.message };
  revalidatePath(`/app/work-orders/${id}`);
  return { error: null };
}

export async function recordWorkOrderPhoto(
  id: string,
  url: string,
  caption: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("work_order_photos").insert({
    work_order_id: id,
    url,
    caption: caption.trim() || null,
    taken_by: user!.id,
  });
  if (error) return { error: error.message };
  await supabase.from("work_order_events").insert({
    work_order_id: id,
    actor: user!.id,
    kind: "photo",
    detail: caption.trim() || "Photo added",
  });
  revalidatePath(`/app/work-orders/${id}`);
  return { error: null };
}

// Create an invoice from a work order (manager+). Pre-fills the customer,
// site, and a labor line; links it for job costing.
export async function createInvoiceFromWorkOrder(workOrderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in", invoiceId: null };

  const { data: wo } = await supabase
    .from("work_orders")
    .select("id, title, customer_id, location_id, invoice_id, minutes_on_site")
    .eq("id", workOrderId)
    .single();
  if (!wo) return { error: "Work order not found", invoiceId: null };
  if (wo.invoice_id)
    return { error: "This work order already has an invoice.", invoiceId: null };
  if (!wo.customer_id)
    return {
      error: "Set a customer on this work order first.",
      invoiceId: null,
    };

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      customer_id: wo.customer_id,
      location_id: wo.location_id,
      title: wo.title,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (invErr) return { error: invErr.message, invoiceId: null };

  // Starter labor line so the invoice isn't empty; edit freely in draft.
  await supabase.from("line_items").insert({
    invoice_id: invoice.id,
    description: `Service — ${wo.title}`,
    quantity: wo.minutes_on_site ? Math.max(0.5, wo.minutes_on_site / 60) : 1,
    unit_price: 0,
  });

  const { error: linkErr } = await supabase
    .from("work_orders")
    .update({ invoice_id: invoice.id })
    .eq("id", workOrderId);
  if (linkErr) return { error: linkErr.message, invoiceId: null };

  revalidatePath(`/app/work-orders/${workOrderId}`);
  return { error: null, invoiceId: invoice.id };
}

// Manual PM generation (manager+). Same engine as the nightly cron.
export async function runPmGeneration() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in", result: null };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const allowed =
    me && ["manager", "admin", "owner", "xpress_pumping"].includes(me.role);
  if (!allowed)
    return { error: "Manager access or above required.", result: null };

  const { generatePmWorkOrders } = await import("@/lib/pm-generator");
  const result = await generatePmWorkOrders();
  revalidatePath("/app/work-orders");
  return { error: null, result };
}

export async function setTripPick(id: string, pick: "yes" | "no" | "maybe") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("trip_picks").upsert({
    work_order_id: id,
    user_id: user!.id,
    pick,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath("/app/work-orders/trip");
  return { error: null };
}

// Clears only YOUR picks for the given state.
export async function clearTripPicks(state: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: ids } = await supabase
    .from("work_orders")
    .select("id")
    .eq("state", state);
  if (ids?.length) {
    const { error } = await supabase
      .from("trip_picks")
      .delete()
      .eq("user_id", user!.id)
      .in(
        "work_order_id",
        ids.map((r) => r.id)
      );
    if (error) return { error: error.message };
  }
  revalidatePath("/app/work-orders/trip");
  return { error: null };
}
