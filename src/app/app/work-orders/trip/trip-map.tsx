"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TripOrder as BaseTripOrder } from "./trip-board";

type TripOrder = BaseTripOrder & { trip_pick: string | null };

function pinIcon(color: string) {
  return divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
  });
}

export default function TripMap({ orders }: { orders: TripOrder[] }) {
  const pinned = orders.filter((o) => o.lat != null && o.lng != null);
  if (!pinned.length) return null;

  const avgLat = pinned.reduce((s, p) => s + p.lat!, 0) / pinned.length;
  const avgLng = pinned.reduce((s, p) => s + p.lng!, 0) / pinned.length;

  return (
    <div
      className="rounded-2xl overflow-hidden border border-[#e4e9f1] shadow-sm mb-6"
      style={{ height: 320 }}
    >
      <MapContainer
        center={[avgLat, avgLng]}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        dragging={
          typeof window === "undefined" ||
          !window.matchMedia("(pointer: coarse)").matches
        }
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pinned.map((o) => {
          const color =
            o.trip_pick === "yes"
              ? "#1f9d63"
              : o.trip_pick === "maybe"
                ? "#ff8a1e"
                : o.trip_pick === "no"
                  ? "#9aa7ba"
                  : "#2f6fd6";
          return (
            <Marker key={o.id} position={[o.lat!, o.lng!]} icon={pinIcon(color)}>
              <Popup>
                <b>
                  WO-{String(o.number).padStart(4, "0")} — {o.title}
                </b>
                <br />
                {[o.address, o.city, o.zip].filter(Boolean).join(", ")}
                {o.trip_pick && (
                  <>
                    <br />
                    Pick: <b>{o.trip_pick}</b>
                  </>
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
