"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Link from "next/link";

export function EquipmentQr({ equipmentId }: { equipmentId: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/app/equipment/${equipmentId}`;
    QRCode.toDataURL(url, {
      width: 160,
      margin: 1,
      color: { dark: "#0e1f38", light: "#ffffff" },
    }).then(setDataUrl);
  }, [equipmentId]);

  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] p-4 flex items-center gap-4">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="Equipment QR code" className="w-24 h-24" />
      ) : (
        <div className="w-24 h-24 bg-[#f5f7fb] rounded" />
      )}
      <div>
        <div className="font-bold text-[#0e1726] text-sm mb-1">
          Field QR code
        </div>
        <p className="text-xs text-[#5a6b85] mb-2 max-w-52">
          Stick this on the unit — techs scan it with their phone camera to
          open this page on site.
        </p>
        <Link
          href={`/app/equipment/${equipmentId}/label`}
          className="text-sm font-semibold text-[#b9700f] hover:underline"
        >
          🖨 Print label →
        </Link>
      </div>
    </div>
  );
}
