"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchProviderSales, type ProviderKey } from "@/lib/integrations";

async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (me?.role !== "owner") return { supabase: null, error: "Owners only." };
  return { supabase, error: null };
}

export async function createIntegration(formData: FormData) {
  const { supabase, error: authErr } = await requireOwner();
  if (!supabase) return { error: authErr };

  const { error } = await supabase.from("integrations").insert({
    provider: String(formData.get("provider") ?? "custom"),
    name: String(formData.get("name") ?? "").trim(),
    api_base_url: String(formData.get("api_base_url") ?? "").trim() || null,
    api_key: String(formData.get("api_key") ?? "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/app/integrations");
  return { error: null };
}

export async function deleteIntegration(id: string) {
  const { supabase, error: authErr } = await requireOwner();
  if (!supabase) return { error: authErr };
  const { error } = await supabase.from("integrations").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/integrations");
  return { error: null };
}

export async function syncIntegration(id: string) {
  const { supabase, error: authErr } = await requireOwner();
  if (!supabase) return { error: authErr, imported: 0 };

  const { data: integ } = await supabase
    .from("integrations")
    .select("id, provider, name, api_base_url, api_key, last_sync_at")
    .eq("id", id)
    .single();
  if (!integ) return { error: "Connection not found.", imported: 0 };
  if (!integ.api_base_url || !integ.api_key)
    return { error: "Add the API base URL and API key first.", imported: 0 };

  // Re-pull the last 90 days (or since last sync minus a 7-day overlap);
  // the unique external_id makes re-imports safe.
  const since = new Date(
    integ.last_sync_at
      ? new Date(integ.last_sync_at).getTime() - 7 * 86400000
      : Date.now() - 90 * 86400000
  )
    .toISOString()
    .slice(0, 10);

  const { records, error: fetchErr } = await fetchProviderSales(
    integ.provider as ProviderKey,
    integ.api_base_url,
    integ.api_key,
    since
  );

  if (fetchErr) {
    await supabase
      .from("integrations")
      .update({ status: "error", last_error: fetchErr })
      .eq("id", id);
    revalidatePath("/app/integrations");
    return { error: fetchErr, imported: 0 };
  }

  let imported = 0;
  for (let i = 0; i < records.length; i += 500) {
    const chunk = records.slice(i, i + 500).map((r) => ({
      integration_id: id,
      external_id: r.external_id,
      occurred_on: r.occurred_on,
      description: r.description,
      category: r.category,
      amount: r.amount,
      raw: r.raw,
    }));
    const { error: upErr, count } = await supabase
      .from("external_sales")
      .upsert(chunk, {
        onConflict: "integration_id,external_id",
        ignoreDuplicates: true,
        count: "exact",
      });
    if (upErr) {
      await supabase
        .from("integrations")
        .update({ status: "error", last_error: upErr.message })
        .eq("id", id);
      revalidatePath("/app/integrations");
      return { error: upErr.message, imported };
    }
    imported += count ?? 0;
  }

  await supabase
    .from("integrations")
    .update({
      status: "connected",
      last_error: null,
      last_sync_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/app/integrations");
  revalidatePath("/app/financials");
  return { error: null, imported };
}
