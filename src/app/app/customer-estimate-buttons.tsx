"use client";

import { useRef, useState } from "react";
import { customerDecideEstimate } from "./estimates/actions";

function SignaturePad({ padRef }: { padRef: React.RefObject<HTMLCanvasElement | null> }) {
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * e.currentTarget.width,
      y: ((e.clientY - r.top) / r.height) * e.currentTarget.height,
    };
  }

  return (
    <canvas
      ref={padRef}
      width={560}
      height={180}
      className="w-full border border-[#e4e9f1] rounded-lg bg-[#fbfcfe] touch-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drawing.current = true;
        last.current = pos(e);
      }}
      onPointerMove={(e) => {
        if (!drawing.current || !last.current) return;
        const ctx = e.currentTarget.getContext("2d");
        if (!ctx) return;
        const p = pos(e);
        ctx.strokeStyle = "#0e1726";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(last.current.x, last.current.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        last.current = p;
      }}
      onPointerUp={() => {
        drawing.current = false;
        last.current = null;
      }}
    />
  );
}

export function CustomerEstimateButtons({ estimateId }: { estimateId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [name, setName] = useState("");
  const padRef = useRef<HTMLCanvasElement | null>(null);

  async function decline() {
    setBusy(true);
    setError(null);
    const result = await customerDecideEstimate(estimateId, "declined");
    setBusy(false);
    if (result.error) setError(result.error);
  }

  function padIsEmpty(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return true;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return false;
    return true;
  }

  async function approveSigned() {
    const canvas = padRef.current;
    setError(null);
    if (!name.trim()) return setError("Type your full name.");
    if (!canvas || padIsEmpty(canvas)) return setError("Please draw your signature.");
    setBusy(true);
    const result = await customerDecideEstimate(estimateId, "approved", {
      name,
      data: canvas.toDataURL("image/png"),
    });
    setBusy(false);
    if (result.error) return setError(result.error);
    setSignOpen(false);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => setSignOpen(true)}
        disabled={busy}
        className="bg-[#1f9d63] hover:opacity-90 text-white font-semibold rounded-lg px-4 py-2 text-sm transition disabled:opacity-60"
      >
        Approve &amp; Sign
      </button>
      <button
        onClick={decline}
        disabled={busy}
        className="bg-white border border-[#e4e9f1] hover:border-[#d24b4b] text-[#d24b4b] font-semibold rounded-lg px-4 py-2 text-sm transition disabled:opacity-60"
      >
        Decline
      </button>
      {error && !signOpen && <span className="text-sm text-[#d24b4b]">{error}</span>}

      {signOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-extrabold text-[#0e1726] mb-1">
              Approve this estimate
            </h2>
            <p className="text-sm text-[#5a6b85] mb-4">
              Type your name and sign below to approve the work described in
              this estimate.
            </p>
            <label className="block text-xs font-semibold text-[#5a6b85] mb-3">
              Full name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="block mt-1 w-full border border-[#e4e9f1] rounded-lg px-3 py-2.5 text-sm bg-white font-normal text-[#0e1726] focus:outline-none focus:border-[#ff8a1e]"
              />
            </label>
            <div className="mb-1 text-xs font-semibold text-[#5a6b85]">Signature</div>
            <SignaturePad padRef={padRef} />
            <button
              type="button"
              onClick={() => {
                const c = padRef.current;
                c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
              }}
              className="text-xs text-[#5a6b85] hover:text-[#b9700f] mt-1"
            >
              Clear signature
            </button>
            {error && (
              <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2 mt-3">{error}</div>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={approveSigned}
                disabled={busy}
                className="flex-1 bg-[#1f9d63] hover:opacity-90 text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
              >
                {busy ? "Submitting…" : "Approve & Sign"}
              </button>
              <button
                onClick={() => { setSignOpen(false); setError(null); }}
                className="px-5 py-2.5 border border-[#e4e9f1] rounded-lg font-semibold text-[#0e1726] hover:border-[#ff8a1e]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
