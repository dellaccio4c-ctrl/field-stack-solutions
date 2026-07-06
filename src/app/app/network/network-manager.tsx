"use client";

import { useState } from "react";
import {
  createCircuit,
  updateCircuit,
  deleteCircuit,
  createDevice,
  updateDevice,
  deleteDevice,
} from "./actions";

type Customer = { id: string; name: string; locations: { id: string; label: string }[] };

type Circuit = {
  id: string;
  provider: string;
  circuit_type: string;
  download_mbps: number | null;
  upload_mbps: number | null;
  static_ip: string | null;
  account_number: string | null;
  status: string;
  install_date: string | null;
  monthly_cost: number | null;
  monthly_price: number | null;
  notes: string | null;
  customer_id: string | null;
  location_id: string | null;
  customerName: string | null;
  locationLabel: string | null;
};

type Device = {
  id: string;
  device_type: string;
  name: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  mac_address: string | null;
  ip_address: string | null;
  install_date: string | null;
  status: string;
  notes: string | null;
  customer_id: string | null;
  location_id: string | null;
  customerName: string | null;
  locationLabel: string | null;
};

const CIRCUIT_TYPES: [string, string][] = [
  ["fiber", "Fiber"],
  ["cable", "Cable"],
  ["dsl", "DSL"],
  ["fixed_wireless", "Fixed Wireless"],
  ["lte_5g", "LTE / 5G"],
  ["satellite", "Satellite"],
  ["other", "Other"],
];

const CIRCUIT_STATUSES = ["quoted", "ordered", "scheduled", "installed", "active", "suspended", "cancelled"];

const DEVICE_TYPES: [string, string][] = [
  ["router", "Router"],
  ["firewall", "Firewall"],
  ["switch", "Switch"],
  ["access_point", "Access Point"],
  ["camera", "Camera"],
  ["nvr", "NVR"],
  ["controller", "Controller"],
  ["pos_terminal", "POS Terminal"],
  ["modem", "Modem"],
  ["ups", "UPS"],
  ["other", "Other"],
];

const STATUS_STYLE: Record<string, string> = {
  active: "bg-[#e3f6ec] text-[#1f9d63]",
  installed: "bg-[#e3f6ec] text-[#1f9d63]",
  quoted: "bg-[#eef1f6] text-[#5a6b85]",
  ordered: "bg-[#e8f0fd] text-[#2f6fd6]",
  scheduled: "bg-[#fff2e3] text-[#b9700f]",
  suspended: "bg-[#fbe7e7] text-[#d24b4b]",
  cancelled: "bg-[#eef1f6] text-[#5a6b85]",
  spare: "bg-[#e8f0fd] text-[#2f6fd6]",
  retired: "bg-[#eef1f6] text-[#5a6b85]",
};

const fmtMoney = (n: number | null) =>
  n == null ? "—" : `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

function CustomerSitePicker({
  customers,
  customerId,
  locationId,
}: {
  customers: Customer[];
  customerId: string | null;
  locationId: string | null;
}) {
  const [cust, setCust] = useState(customerId ?? "");
  const sites = customers.find((c) => c.id === cust)?.locations ?? [];
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block text-xs font-semibold text-[#5a6b85]">
        Customer
        <select
          name="customer_id"
          value={cust}
          onChange={(e) => setCust(e.target.value)}
          className="block mt-1 w-full border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]"
        >
          <option value="">—</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold text-[#5a6b85]">
        Site
        <select
          name="location_id"
          defaultValue={locationId ?? ""}
          className="block mt-1 w-full border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]"
        >
          <option value="">—</option>
          {sites.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

const inputCls =
  "block mt-1 w-full border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white font-normal text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]";
const labelCls = "block text-xs font-semibold text-[#5a6b85]";

export function NetworkManager({
  circuits,
  devices,
  customers,
}: {
  circuits: Circuit[];
  devices: Device[];
  customers: Customer[];
}) {
  const [tab, setTab] = useState<"circuits" | "devices">("circuits");
  const [editCircuit, setEditCircuit] = useState<Circuit | "new" | null>(null);
  const [editDevice, setEditDevice] = useState<Device | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const needle = q.toLowerCase();
  const visCircuits = circuits.filter((c) =>
    [c.provider, c.customerName, c.locationLabel, c.status, c.circuit_type, c.account_number]
      .join(" ")
      .toLowerCase()
      .includes(needle)
  );
  const visDevices = devices.filter((d) =>
    [d.name, d.device_type, d.brand, d.model, d.serial_number, d.ip_address, d.customerName, d.locationLabel]
      .join(" ")
      .toLowerCase()
      .includes(needle)
  );

  async function submitCircuit(fd: FormData) {
    setError(null);
    const res =
      editCircuit === "new"
        ? await createCircuit(fd)
        : await updateCircuit((editCircuit as Circuit).id, fd);
    if (res.error) return setError(res.error);
    setEditCircuit(null);
  }

  async function submitDevice(fd: FormData) {
    setError(null);
    const res =
      editDevice === "new"
        ? await createDevice(fd)
        : await updateDevice((editDevice as Device).id, fd);
    if (res.error) return setError(res.error);
    setEditDevice(null);
  }

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="flex rounded-lg border border-[#e4e9f1] overflow-hidden">
          {(["circuits", "devices"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm font-semibold capitalize transition ${
                tab === t ? "bg-[#0e1f38] text-white" : "bg-white text-[#5a6b85] hover:text-[#0e1726]"
              }`}
            >
              {t === "circuits" ? `Circuits (${circuits.length})` : `Devices (${devices.length})`}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search provider, site, device, serial, IP…"
          className="border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#ff8a1e] w-72"
        />
        <div className="grow" />
        <button
          onClick={() => (tab === "circuits" ? setEditCircuit("new") : setEditDevice("new"))}
          className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2 text-sm transition"
        >
          {tab === "circuits" ? "New circuit" : "New device"}
        </button>
      </div>

      {tab === "circuits" ? (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
          {!visCircuits.length ? (
            <div className="p-8 text-center text-[#5a6b85] text-sm">
              No circuits yet — add the first internet setup.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1]">
                  <th className="px-4 py-3 font-semibold">Provider</th>
                  <th className="px-4 py-3 font-semibold">Customer / Site</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Speed</th>
                  <th className="px-4 py-3 font-semibold text-right">Cost / mo</th>
                  <th className="px-4 py-3 font-semibold text-right">Billed / mo</th>
                  <th className="px-4 py-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {visCircuits.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setEditCircuit(c)}
                    className="border-b border-[#e4e9f1] last:border-0 hover:bg-[#f5f7fb] cursor-pointer"
                  >
                    <td className="px-4 py-3 font-semibold">{c.provider}</td>
                    <td className="px-4 py-3 text-[#5a6b85]">
                      {c.customerName ?? "—"}
                      {c.locationLabel ? ` — ${c.locationLabel}` : ""}
                    </td>
                    <td className="px-4 py-3 capitalize text-[#5a6b85]">
                      {c.circuit_type.replace("_", " / ")}
                    </td>
                    <td className="px-4 py-3 text-[#5a6b85]">
                      {c.download_mbps ? `${c.download_mbps}↓` : "—"}
                      {c.upload_mbps ? ` / ${c.upload_mbps}↑` : ""}
                    </td>
                    <td className="px-4 py-3 text-right text-[#d24b4b]">{fmtMoney(c.monthly_cost)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#1f9d63]">{fmtMoney(c.monthly_price)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold capitalize ${STATUS_STYLE[c.status] ?? ""}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm overflow-x-auto">
          {!visDevices.length ? (
            <div className="p-8 text-center text-[#5a6b85] text-sm">
              No devices yet — add routers, switches, APs, cameras, POS terminals.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#5a6b85] border-b border-[#e4e9f1]">
                  <th className="px-4 py-3 font-semibold">Device</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Customer / Site</th>
                  <th className="px-4 py-3 font-semibold">Brand / Model</th>
                  <th className="px-4 py-3 font-semibold">IP</th>
                  <th className="px-4 py-3 font-semibold">Serial</th>
                  <th className="px-4 py-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {visDevices.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => setEditDevice(d)}
                    className="border-b border-[#e4e9f1] last:border-0 hover:bg-[#f5f7fb] cursor-pointer"
                  >
                    <td className="px-4 py-3 font-semibold">{d.name}</td>
                    <td className="px-4 py-3 capitalize text-[#5a6b85]">{d.device_type.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-[#5a6b85]">
                      {d.customerName ?? "—"}
                      {d.locationLabel ? ` — ${d.locationLabel}` : ""}
                    </td>
                    <td className="px-4 py-3 text-[#5a6b85]">
                      {[d.brand, d.model].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-[#5a6b85]">{d.ip_address ?? "—"}</td>
                    <td className="px-4 py-3 text-[#5a6b85]">{d.serial_number ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold capitalize ${STATUS_STYLE[d.status] ?? ""}`}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {editCircuit && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-4">
              {editCircuit === "new" ? "New circuit" : "Edit circuit"}
            </h2>
            <form action={submitCircuit} className="space-y-4">
              <CustomerSitePicker
                customers={customers}
                customerId={editCircuit === "new" ? null : editCircuit.customer_id}
                locationId={editCircuit === "new" ? null : editCircuit.location_id}
              />
              <div className="grid grid-cols-2 gap-3">
                <label className={labelCls}>
                  Provider / ISP *
                  <input name="provider" required defaultValue={editCircuit === "new" ? "" : editCircuit.provider} placeholder="e.g. AT&T Business Fiber" className={inputCls} />
                </label>
                <label className={labelCls}>
                  Circuit type
                  <select name="circuit_type" defaultValue={editCircuit === "new" ? "fiber" : editCircuit.circuit_type} className={inputCls}>
                    {CIRCUIT_TYPES.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <label className={labelCls}>
                  Down (Mbps)
                  <input name="download_mbps" type="number" defaultValue={editCircuit === "new" ? "" : editCircuit.download_mbps ?? ""} className={inputCls} />
                </label>
                <label className={labelCls}>
                  Up (Mbps)
                  <input name="upload_mbps" type="number" defaultValue={editCircuit === "new" ? "" : editCircuit.upload_mbps ?? ""} className={inputCls} />
                </label>
                <label className={labelCls}>
                  Status
                  <select name="status" defaultValue={editCircuit === "new" ? "quoted" : editCircuit.status} className={inputCls}>
                    {CIRCUIT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className={labelCls}>
                  Install date
                  <input name="install_date" type="date" defaultValue={editCircuit === "new" ? "" : editCircuit.install_date ?? ""} className={inputCls} />
                </label>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <label className={labelCls}>
                  Static IP
                  <input name="static_ip" defaultValue={editCircuit === "new" ? "" : editCircuit.static_ip ?? ""} className={inputCls} />
                </label>
                <label className={labelCls}>
                  Account #
                  <input name="account_number" defaultValue={editCircuit === "new" ? "" : editCircuit.account_number ?? ""} className={inputCls} />
                </label>
                <label className={labelCls}>
                  Carrier cost / mo
                  <input name="monthly_cost" type="number" step="0.01" defaultValue={editCircuit === "new" ? "" : editCircuit.monthly_cost ?? ""} className={inputCls} />
                </label>
                <label className={labelCls}>
                  Billed / mo
                  <input name="monthly_price" type="number" step="0.01" defaultValue={editCircuit === "new" ? "" : editCircuit.monthly_price ?? ""} className={inputCls} />
                </label>
              </div>
              <label className={labelCls}>
                Notes
                <textarea name="notes" rows={2} defaultValue={editCircuit === "new" ? "" : editCircuit.notes ?? ""} className={inputCls} />
              </label>
              {error && (
                <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2">{error}</div>
              )}
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-2.5 transition">
                  Save circuit
                </button>
                {editCircuit !== "new" && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Delete this circuit?")) return;
                      await deleteCircuit(editCircuit.id);
                      setEditCircuit(null);
                    }}
                    className="px-4 py-2.5 border border-[#e4e9f1] rounded-lg font-semibold text-[#d24b4b] hover:border-[#d24b4b]"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setEditCircuit(null); setError(null); }}
                  className="px-5 py-2.5 border border-[#e4e9f1] rounded-lg font-semibold text-[#0e1726] hover:border-[#ff8a1e]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editDevice && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-4">
              {editDevice === "new" ? "New device" : "Edit device"}
            </h2>
            <form action={submitDevice} className="space-y-4">
              <CustomerSitePicker
                customers={customers}
                customerId={editDevice === "new" ? null : editDevice.customer_id}
                locationId={editDevice === "new" ? null : editDevice.location_id}
              />
              <div className="grid grid-cols-2 gap-3">
                <label className={labelCls}>
                  Device name *
                  <input name="name" required defaultValue={editDevice === "new" ? "" : editDevice.name} placeholder="e.g. Office Router" className={inputCls} />
                </label>
                <label className={labelCls}>
                  Type
                  <select name="device_type" defaultValue={editDevice === "new" ? "router" : editDevice.device_type} className={inputCls}>
                    {DEVICE_TYPES.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className={labelCls}>
                  Brand
                  <input name="brand" defaultValue={editDevice === "new" ? "" : editDevice.brand ?? ""} placeholder="Ubiquiti, Cisco…" className={inputCls} />
                </label>
                <label className={labelCls}>
                  Model
                  <input name="model" defaultValue={editDevice === "new" ? "" : editDevice.model ?? ""} className={inputCls} />
                </label>
                <label className={labelCls}>
                  Serial number
                  <input name="serial_number" defaultValue={editDevice === "new" ? "" : editDevice.serial_number ?? ""} className={inputCls} />
                </label>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <label className={labelCls}>
                  MAC address
                  <input name="mac_address" defaultValue={editDevice === "new" ? "" : editDevice.mac_address ?? ""} className={inputCls} />
                </label>
                <label className={labelCls}>
                  IP address
                  <input name="ip_address" defaultValue={editDevice === "new" ? "" : editDevice.ip_address ?? ""} className={inputCls} />
                </label>
                <label className={labelCls}>
                  Install date
                  <input name="install_date" type="date" defaultValue={editDevice === "new" ? "" : editDevice.install_date ?? ""} className={inputCls} />
                </label>
                <label className={labelCls}>
                  Status
                  <select name="status" defaultValue={editDevice === "new" ? "active" : editDevice.status} className={inputCls}>
                    <option value="active">Active</option>
                    <option value="spare">Spare</option>
                    <option value="retired">Retired</option>
                  </select>
                </label>
              </div>
              <label className={labelCls}>
                Notes
                <textarea name="notes" rows={2} defaultValue={editDevice === "new" ? "" : editDevice.notes ?? ""} className={inputCls} />
              </label>
              {error && (
                <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2">{error}</div>
              )}
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg py-2.5 transition">
                  Save device
                </button>
                {editDevice !== "new" && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Delete this device?")) return;
                      await deleteDevice(editDevice.id);
                      setEditDevice(null);
                    }}
                    className="px-4 py-2.5 border border-[#e4e9f1] rounded-lg font-semibold text-[#d24b4b] hover:border-[#d24b4b]"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setEditDevice(null); setError(null); }}
                  className="px-5 py-2.5 border border-[#e4e9f1] rounded-lg font-semibold text-[#0e1726] hover:border-[#ff8a1e]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
