import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PROVIDERS, type ProviderKey } from "@/lib/integrations";
import { money } from "@/lib/money";
import { IntegrationsManager } from "./integrations-manager";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (me?.role !== "owner") redirect("/app");

  const [{ data: integrations }, { data: salesAgg }] = await Promise.all([
    supabase
      .from("integrations")
      .select("id, provider, name, api_base_url, status, last_sync_at, last_error, is_active")
      .order("created_at"),
    supabase.from("external_sales").select("integration_id, amount"),
  ]);

  const totals = new Map<string, { count: number; amount: number }>();
  for (const s of salesAgg ?? []) {
    const t = totals.get(s.integration_id) ?? { count: 0, amount: 0 };
    t.count++;
    t.amount += Number(s.amount);
    totals.set(s.integration_id, t);
  }

  const rows = (integrations ?? []).map((i) => ({
    ...i,
    providerLabel: PROVIDERS[i.provider as ProviderKey]?.label ?? i.provider,
    recordCount: totals.get(i.id)?.count ?? 0,
    totalAmount: money(totals.get(i.id)?.amount ?? 0),
  }));

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726] mb-2">
        Integrations
      </h1>
      <p className="text-[#5a6b85] mb-6 max-w-2xl">
        Connect the sales systems your sites run on — Sonny&apos;s Controls POS,
        NXT, Storage 360, or any REST API that returns JSON sales records.
        Synced sales feed the Financials dashboard alongside FieldStack
        invoices. API keys are visible to Owners only.
      </p>
      <IntegrationsManager integrations={rows} />
    </div>
  );
}
