"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim() || null;
const int = (fd: FormData, k: string) => {
  const n = parseInt(String(fd.get(k) ?? ""), 10);
  return isNaN(n) || n <= 0 ? null : n;
};
const num = (fd: FormData, k: string) => {
  const n = parseFloat(String(fd.get(k) ?? ""));
  return isNaN(n) || n < 0 ? null : n;
};

function circuitPayload(fd: FormData) {
  return {
    customer_id: str(fd, "customer_id"),
    location_id: str(fd, "location_id"),
    provider: String(fd.get("provider") ?? "").trim(),
    circuit_type: String(fd.get("circuit_type") ?? "fiber"),
    download_mbps: int(fd, "download_mbps"),
    upload_mbps: int(fd, "upload_mbps"),
    static_ip: str(fd, "static_ip"),
    account_number: str(fd, "account_number"),
    status: String(fd.get("status") ?? "quoted"),
    install_date: str(fd, "install_date"),
    monthly_cost: num(fd, "monthly_cost"),
    monthly_price: num(fd, "monthly_price"),
    notes: str(fd, "notes"),
  };
}

export async function createCircuit(fd: FormData) {
  const supabase = await createClient();
  const payload = circuitPayload(fd);
  if (!payload.provider) return { error: "Provider is required." };
  const { error } = await supabase.from("network_circuits").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/app/network");
  return { error: null };
}

export async function updateCircuit(id: string, fd: FormData) {
  const supabase = await createClient();
  const payload = circuitPayload(fd);
  if (!payload.provider) return { error: "Provider is required." };
  const { error } = await supabase
    .from("network_circuits")
    .update(payload)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/network");
  return { error: null };
}

export async function deleteCircuit(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("network_circuits").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/network");
  return { error: null };
}

function devicePayload(fd: FormData) {
  return {
    customer_id: str(fd, "customer_id"),
    location_id: str(fd, "location_id"),
    device_type: String(fd.get("device_type") ?? "other"),
    name: String(fd.get("name") ?? "").trim(),
    brand: str(fd, "brand"),
    model: str(fd, "model"),
    serial_number: str(fd, "serial_number"),
    mac_address: str(fd, "mac_address"),
    ip_address: str(fd, "ip_address"),
    install_date: str(fd, "install_date"),
    status: String(fd.get("status") ?? "active"),
    notes: str(fd, "notes"),
  };
}

export async function createDevice(fd: FormData) {
  const supabase = await createClient();
  const payload = devicePayload(fd);
  if (!payload.name) return { error: "Device name is required." };
  const { error } = await supabase.from("network_devices").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/app/network");
  return { error: null };
}

export async function updateDevice(id: string, fd: FormData) {
  const supabase = await createClient();
  const payload = devicePayload(fd);
  if (!payload.name) return { error: "Device name is required." };
  const { error } = await supabase
    .from("network_devices")
    .update(payload)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/network");
  return { error: null };
}

export async function deleteDevice(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("network_devices").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/network");
  return { error: null };
}

// Recurring internet billing: one draft invoice per customer per month,
// with a line for each active circuit that has a billed price. Idempotent —
// circuits already billed for the current month are skipped.
export async function generateCircuitBilling() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", invoices: 0, circuits: 0 };
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!me || !["admin", "owner"].includes(me.role))
    return { error: "Only Admins and Owners can generate billing.", invoices: 0, circuits: 0 };

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  const { data: circuits, error: qErr } = await supabase
    .from("network_circuits")
    .select("id, provider, monthly_price, customer_id, location_id, locations(label)")
    .eq("status", "active")
    .gt("monthly_price", 0)
    .not("customer_id", "is", null)
    .or(`last_billed_month.is.null,last_billed_month.neq.${monthKey}`);
  if (qErr) return { error: qErr.message, invoices: 0, circuits: 0 };
  if (!circuits?.length)
    return { error: null, invoices: 0, circuits: 0 };

  const byCustomer = new Map<string, typeof circuits>();
  for (const c of circuits) {
    const list = byCustomer.get(c.customer_id!) ?? [];
    list.push(c);
    byCustomer.set(c.customer_id!, list);
  }

  let invoiceCount = 0;
  let circuitCount = 0;
  for (const [customerId, list] of byCustomer) {
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .insert({
        customer_id: customerId,
        location_id: list.length === 1 ? list[0].location_id : null,
        title: `Internet service — ${monthLabel}`,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (invErr) return { error: invErr.message, invoices: invoiceCount, circuits: circuitCount };

    const lines = list.map((c) => ({
      invoice_id: invoice.id,
      description: `Internet — ${c.provider}${
        (c.locations as unknown as { label: string } | null)?.label
          ? ` (${(c.locations as unknown as { label: string }).label})`
          : ""
      } — ${monthLabel}`,
      quantity: 1,
      unit_price: Number(c.monthly_price),
    }));
    const { error: lineErr } = await supabase.from("line_items").insert(lines);
    if (lineErr) return { error: lineErr.message, invoices: invoiceCount, circuits: circuitCount };

    const { error: markErr } = await supabase
      .from("network_circuits")
      .update({ last_billed_month: monthKey })
      .in("id", list.map((c) => c.id));
    if (markErr) return { error: markErr.message, invoices: invoiceCount, circuits: circuitCount };

    invoiceCount++;
    circuitCount += list.length;
  }

  revalidatePath("/app/network");
  revalidatePath("/app/invoices");
  return { error: null, invoices: invoiceCount, circuits: circuitCount };
}
