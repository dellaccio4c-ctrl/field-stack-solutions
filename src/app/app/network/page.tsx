import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/money";
import { StatusBadge, PriorityBadge } from "../status-badge";
import { NetworkManager } from "./network-manager";
import { BillingButton } from "./billing-button";

const OPEN_WO = ["open", "scheduled", "in_progress", "on_hold"];

export default async function NetworkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  const isAdmin = !!me && ["admin", "owner"].includes(me.role);

  const [
    { data: circuits },
    { data: devices },
    { data: networkWOs },
    { data: customers },
  ] = await Promise.all([
    supabase
      .from("network_circuits")
      .select(
        "id, provider, circuit_type, download_mbps, upload_mbps, static_ip, account_number, status, install_date, monthly_cost, monthly_price, notes, customer_id, location_id, customers(name), locations(label)"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("network_devices")
      .select(
        "id, device_type, name, brand, model, serial_number, mac_address, ip_address, install_date, status, notes, customer_id, location_id, customers(name), locations(label)"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("work_orders")
      .select("id, number, title, status, priority, customers(name), locations(label)")
      .eq("wo_type", "network")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("customers")
      .select("id, name, locations(id, label)")
      .order("name"),
  ]);

  const activeCircuits = (circuits ?? []).filter((c) => c.status === "active");
  const inFlight = (circuits ?? []).filter((c) =>
    ["quoted", "ordered", "scheduled"].includes(c.status)
  );
  const monthlyInternetSales = activeCircuits.reduce(
    (s, c) => s + Number(c.monthly_price ?? 0),
    0
  );
  const monthlyMargin = activeCircuits.reduce(
    (s, c) => s + (Number(c.monthly_price ?? 0) - Number(c.monthly_cost ?? 0)),
    0
  );
  const activeDevices = (devices ?? []).filter((d) => d.status === "active");
  const openNetworkWOs = (networkWOs ?? []).filter((w) =>
    OPEN_WO.includes(w.status)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
          Network
        </h1>
        {isAdmin && <BillingButton />}
      </div>
      <p className="text-[#5a6b85] mb-6">
        Internet circuits, network installs, and every device on the wire —
        across all sites.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Tile label="Active circuits" value={String(activeCircuits.length)} accent="#1f9d63" />
        <Tile label="Installs in flight" value={String(inFlight.length)} accent="#b9700f" />
        <Tile label="Internet sales / mo" value={money(monthlyInternetSales)} accent="#7c5cd6" />
        <Tile label="Circuit margin / mo" value={money(monthlyMargin)} accent={monthlyMargin >= 0 ? "#1f9d63" : "#d24b4b"} />
        <Tile label="Active devices" value={String(activeDevices.length)} accent="#2f6fd6" />
      </div>

      <NetworkManager
        circuits={(circuits ?? []).map((c) => ({
          ...c,
          customerName: (c.customers as unknown as { name: string } | null)?.name ?? null,
          locationLabel: (c.locations as unknown as { label: string } | null)?.label ?? null,
        }))}
        devices={(devices ?? []).map((d) => ({
          ...d,
          customerName: (d.customers as unknown as { name: string } | null)?.name ?? null,
          locationLabel: (d.locations as unknown as { label: string } | null)?.label ?? null,
        }))}
        customers={(customers ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          locations: (c.locations as unknown as { id: string; label: string }[]) ?? [],
        }))}
      />

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-[#0e1726]">
            Network work orders{" "}
            <span className="text-sm font-semibold text-[#5a6b85]">
              ({openNetworkWOs.length} open)
            </span>
          </h2>
          <Link
            href="/app/work-orders"
            className="text-sm font-semibold text-[#b9700f] hover:underline"
          >
            All work orders →
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
          {!networkWOs?.length ? (
            <div className="p-6 text-center text-[#5a6b85] text-sm">
              No network work orders yet — create one from Work Orders with type
              &quot;Network&quot;.
            </div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {networkWOs.map((w) => (
                  <tr key={w.id} className="border-b border-[#e4e9f1] last:border-0 hover:bg-[#f5f7fb]">
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/app/work-orders/${w.id}`} className="hover:text-[#b9700f]">
                        WO-{w.number} · {w.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#5a6b85]">
                      {(w.customers as unknown as { name: string } | null)?.name ?? "—"}
                      {(w.locations as unknown as { label: string } | null)?.label
                        ? ` — ${(w.locations as unknown as { label: string }).label}`
                        : ""}
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={w.priority} /></td>
                    <td className="px-4 py-3 text-right"><StatusBadge status={w.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] p-5 shadow-sm">
      <div className="text-xs font-bold tracking-wider text-[#5a6b85] uppercase mb-1">{label}</div>
      <div className="text-xl font-extrabold" style={{ color: accent }}>{value}</div>
    </div>
  );
}
