"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";

type Eq = {
  id: string;
  name: string;
  serial_number: string | null;
  unit_number: string | null;
  brand: string | null;
  model: string | null;
  customerName: string | null;
  locationLabel: string | null;
};

export function LabelCard({ equipment }: { equipment: Eq }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/app/equipment/${equipment.id}`;
    QRCode.toDataURL(url, {
      width: 400,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark: "#0e1f38", light: "#ffffff" },
    }).then(setDataUrl);
  }, [equipment.id]);

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link
          href={`/app/equipment/${equipment.id}`}
          className="text-sm text-[#5a6b85] hover:text-[#b9700f]"
        >
          ← Back to unit
        </Link>
        <button
          onClick={() => window.print()}
          className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2 transition"
        >
          🖨 Print label
        </button>
      </div>

      {/* The label itself — sized for a 3x4" sticker, scales when printed */}
      <div className="bg-white border-2 border-[#0e1f38] rounded-xl p-6 text-center print:border-4">
        <div className="text-xs font-bold tracking-[0.2em] text-[#b9700f] mb-1">
          FIELD STACK SOLUTIONS
        </div>
        <div className="text-xl font-extrabold text-[#0e1726] leading-tight mb-1">
          {equipment.name}
        </div>
        <div className="text-sm text-[#5a6b85] mb-3">
          {[equipment.brand, equipment.model].filter(Boolean).join(" ")}
          {equipment.unit_number && ` · Unit ${equipment.unit_number}`}
        </div>

        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt="Scan to view service history"
            className="w-56 h-56 mx-auto"
          />
        ) : (
          <div className="w-56 h-56 mx-auto bg-[#f5f7fb] rounded" />
        )}

        <div className="mt-3 text-sm font-bold text-[#0e1726]">
          SCAN FOR SERVICE HISTORY
        </div>
        {equipment.serial_number && (
          <div className="mt-1 font-mono text-xs text-[#5a6b85]">
            S/N {equipment.serial_number}
          </div>
        )}
        <div className="text-xs text-[#5a6b85] mt-1">
          {[equipment.customerName, equipment.locationLabel]
            .filter(Boolean)
            .join(" — ")}
        </div>
      </div>

      <p className="text-xs text-[#5a6b85] text-center mt-4 print:hidden">
        Print on adhesive label stock or laminate. Scanning requires a
        FieldStack login — customers and techs see only what their role allows.
      </p>
    </div>
  );
}
