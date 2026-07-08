import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { qboConfigured } from "@/lib/quickbooks";
import { QboControls } from "./qbo-controls";

export default async function QuickbooksPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
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

  const [{ data: conn }, { count: linkCount }] = await Promise.all([
    supabase.from("qbo_connection").select("realm_id, connected_at, last_sync_at, last_error").limit(1).maybeSingle(),
    supabase.from("qbo_links").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726] mb-2">
        QuickBooks Sync
      </h1>
      <p className="text-[#5a6b85] mb-6">
        Push customers, invoices, payments, and expenses into QuickBooks Online
        — no re-keying. Records sync once and stay linked.
      </p>

      {connected && (
        <div className="text-sm text-[#1f9d63] bg-[#e3f6ec] rounded-lg px-3 py-2 mb-4">
          Connected to QuickBooks. Run your first sync below.
        </div>
      )}
      {error && (
        <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2 mb-4">
          {error}
        </div>
      )}

      {!qboConfigured() ? (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-6 shadow-sm text-sm text-[#5a6b85]">
          <div className="font-bold text-[#0e1726] mb-2">Setup needed</div>
          Add <code className="bg-[#f5f7fb] px-1.5 py-0.5 rounded">QBO_CLIENT_ID</code>{" "}
          and <code className="bg-[#f5f7fb] px-1.5 py-0.5 rounded">QBO_CLIENT_SECRET</code>{" "}
          from your Intuit developer app (Keys &amp; Credentials) to the Vercel
          environment variables, then redeploy. The Connect button lights up
          automatically.
        </div>
      ) : (
        <QboControls
          connection={
            conn
              ? {
                  realmId: conn.realm_id,
                  connectedAt: conn.connected_at,
                  lastSyncAt: conn.last_sync_at,
                  lastError: conn.last_error,
                }
              : null
          }
          linkCount={linkCount ?? 0}
        />
      )}
    </div>
  );
}
