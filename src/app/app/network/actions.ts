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
