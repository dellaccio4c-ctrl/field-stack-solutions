import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { googleMapsDirectionsUrl } from "@/lib/geocode";
import { money } from "@/lib/money";
import { BackLink } from "../../back-link";
import { StatusBadge, PriorityBadge, WoTypeBadge } from "../../status-badge";

const OPEN_WO = ["open", "scheduled", "in_progress", "on_hold"];

const CIRCUIT_STYLE: Record<string, string> = {
  active: "bg-[#e3f6ec] text-[#1f9d63]",
  installed: "bg-[#e3f6ec] text-[#1f9d63]",
  quoted: "bg-[#eef1f6] text-[#5a6b85]",
  ordered: "bg-[#e8f0fd] text-[#2f6fd6]",
  scheduled: "bg-[#fff2e3] text-[#b9700f]",
  suspended: "bg-[#fbe7e7] text-[#d24b4b]",
  cancelled: "bg-[#eef1f6] text-[#5a6b85]",
};

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase
    .from("locations")
    .select("id, label, address, city, state, zip, notes, lat, lng, customer_id, customers(name)")
    .eq("id", id)
    .single();
  if (!site) notFound();

  const [
    { data: equipment },
    { data: circuits },
    { data: devices },
    { data: workOrders },
  ] = await Promise.all([
    supabase
      .from("equipment")
      .select("id, name, category, brand, model, serial_number, unit_number, status")
      .eq("location_id", id)
      .order("name"),
    supabase
      .from("network_circuits")
      .select("id, provider, circuit_type, download_mbps, upload_mbps, status, monthly_price")
      .eq("location_id", id)
      .order("created_at"),
    supabase
      .from("network_devices")
      .select("id, name, device_type, brand, model, ip_address, status")
      .eq("location_id", id)
      .order("name"),
    supabase
      .from("work_orders")
      .select("id, number, title, status, priority, wo_type, created_at")
      .eq("location_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const address = [site.address, site.city, site.state, site.zip]
    .filter(Boolean)
    .join(", ");
  const customerName =
    (site.customers as unknown as { name: string } | null)?.name ?? "—";
  const openWOs = (workOrders ?? []).filter((w) => OPEN_WO.includes(w.status));
  const activeCircuits = (circuits ?? []).filter((c) => c.status === "active");
  const internetMonthly = activeCircuits.reduce(
    (s, c) => s + Number(c.monthly_price ?? 0),
    0
  );

  return (
    <div>
      <BackLink fallback="/app/sites" scope="/app/sites" label="Back to Sites" />

      <div className="flex items-start justify-between flex-wrap gap-3 mb-1 mt-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0e1726]">
          {site.label}
        </h1>
        {address && (
          <a
            href={googleMapsDirectionsUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-[#e4e9f1] hover:border-[#ff8a1e] text-[#0e1726] font-semibold rounded-lg px-4 py-2 text-sm transition"
          >
            Google Maps directions
          </a>
        )}
      </div>
      <p className="text-[#5a6b85] mb-6">
        <Link
          href={`/app/customers/${site.customer_id}`}
          className="font-semibold hover:text-[#b9700f]"
        >
          {customerName}
        </Link>
        {address ? ` · ${address}` : ""}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Tile label="Open work orders" value={String(openWOs.length)} accent={openWOs.length > 0 ? "#d24b4b" : "#1f9d63"} />
        <Tile label="Equipment" value={String(equipment?.length ?? 0)} accent="#2f6fd6" />
        <Tile label="Active circuits" value={String(activeCircuits.length)} accent="#1f9d63" />
        <Tile label="Internet billed / mo" value={money(internetMonthly)} accent="#7c5cd6" />
      </div>

      {site.notes && (
        <div className="bg-[#fff2e3] border border-[#ffd9a8] rounded-2xl p-4 mb-8 text-sm text-[#0e1726]">
          <span className="font-bold">Site notes:</span> {site.notes}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <section>
          <h2 className="text-lg font-extrabold text-[#0e1726] mb-3">
            Network{" "}
            <Link href="/app/network" className="text-sm font-semibold text-[#b9700f] hover:underline ml-1">
              manage →
            </Link>
          </h2>
          <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-hidden">
            {!circuits?.length && !devices?.length ? (
              <div className="p-6 text-center text-[#5a6b85] text-sm">
                No circuits or devices at this site yet.
              </div>
            ) : (
              <div>
                {(circuits ?? []).map((c) => (
                  <div key={c.id} className="px-4 py-3 border-b border-[#e4e9f1] flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm">{c.provider}</div>
                      <div className="text-xs text-[#5a6b85] capitalize">
                        {c.circuit_type.replace("_", " / ")}
                        {c.download_mbps ? ` · ${c.download_mbps}↓${c.upload_mbps ? `/${c.upload_mbps}↑` : ""} Mbps` : ""}
                        {c.monthly_price ? ` · ${money(Number(c.monthly_price))}/mo` : ""}
                      </div>
                    </div>
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold capitalize ${CIRCUIT_STYLE[c.status] ?? ""}`}>
                      {c.status}
                    </span>
                  </div>
                ))}
                {(devices ?? []).map((d) => (
                  <div key={d.id} className="px-4 py-2.5 border-b border-[#e4e9f1] last:border-0 flex items-center justify-between gap-2 text-sm">
                    <div className="text-[#0e1726]">
                      {d.name}
                      <span className="text-xs text-[#5a6b85] capitalize">
                        {" "}· {d.device_type.replace("_", " ")}
                        {d.brand ? ` · ${d.brand}${d.model ? ` ${d.model}` : ""}` : ""}
                        {d.ip_address ? ` · ${d.ip_address}` : ""}
                      </span>
                    </div>
                    <span className="text-xs font-semibold capitalize text-[#5a6b85]">{d.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-[#0e1726] mb-3">
            Equipment{" "}
            <Link
              href={`/app/equipment?customer=${site.customer_id}&location=${site.id}`}
              className="text-sm font-semibold text-[#b9700f] hover:underline ml-1"
            >
              manage →
            </Link>
          </h2>
          <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-hidden">
            {!equipment?.length ? (
              <div className="p-6 text-center text-[#5a6b85] text-sm">
                No equipment registered at this site.
              </div>
            ) : (
              <div>
                {equipment.map((e) => (
                  <Link
                    key={e.id}
                    href={`/app/equipment/${e.id}`}
                    className="px-4 py-3 border-b border-[#e4e9f1] last:border-0 flex items-center justify-between gap-2 hover:bg-[#f5f7fb] text-sm block"
                  >
                    <div>
                      <span className="font-semibold">{e.name}</span>
                      <span className="text-xs text-[#5a6b85]">
                        {" "}
                        {[e.brand, e.model].filter(Boolean).join(" ")}
                        {e.serial_number ? ` · SN ${e.serial_number}` : ""}
                        {e.unit_number ? ` · Unit ${e.unit_number}` : ""}
                      </span>
                    </div>
                    <span className="text-xs font-semibold capitalize text-[#5a6b85]">{e.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-lg font-extrabold text-[#0e1726] mb-3">
          Work orders{" "}
          <span className="text-sm font-semibold text-[#5a6b85]">
            ({openWOs.length} open)
          </span>
        </h2>
        <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-hidden">
          {!workOrders?.length ? (
            <div className="p-6 text-center text-[#5a6b85] text-sm">
              No work orders at this site yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {workOrders.map((w) => (
                  <tr key={w.id} className="border-b border-[#e4e9f1] last:border-0 hover:bg-[#f5f7fb]">
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/app/work-orders/${w.id}`} className="hover:text-[#b9700f]">
                        WO-{w.number} · {w.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#5a6b85]">
                      {new Date(w.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3"><WoTypeBadge type={w.wo_type} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={w.priority} /></td>
                    <td className="px-4 py-3 text-right"><StatusBadge status={w.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
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
