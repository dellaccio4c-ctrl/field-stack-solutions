"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { divIcon } from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

export type SiteRow = {
  id: string;
  label: string;
  address: string;
  customerId: string | null;
  customerName: string;
  equipmentCount: number;
  openWOs: number;
  lat: number | null;
  lng: number | null;
};

function pinIcon(color: string) {
  return divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
  });
}

export default function SitesMap({ sites }: { sites: SiteRow[] }) {
  const pinned = sites.filter((s) => s.lat != null && s.lng != null);
  if (!pinned.length) return null;

  const avgLat = pinned.reduce((s, p) => s + p.lat!, 0) / pinned.length;
  const avgLng = pinned.reduce((s, p) => s + p.lng!, 0) / pinned.length;

  return (
    <div
      className="rounded-2xl overflow-hidden border border-[#e4e9f1] shadow-sm mb-6"
      style={{ height: 360 }}
    >
      <MapContainer
        center={[avgLat, avgLng]}
        zoom={8}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pinned.map((s) => (
          <Marker
            key={s.id}
            position={[s.lat!, s.lng!]}
            icon={pinIcon(s.openWOs > 0 ? "#d24b4b" : "#1f9d63")}
          >
            <Popup>
              <b>{s.label}</b> — {s.customerName}
              <br />
              {s.address}
              <br />
              {s.equipmentCount} equipment · {s.openWOs} open work order
              {s.openWOs === 1 ? "" : "s"}
              <br />
              {s.customerId && (
                <Link href={`/app/customers/${s.customerId}`}>
                  Open customer →
                </Link>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
