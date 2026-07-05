"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { recordWorkOrderPhoto } from "../actions";

type Photo = {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
  photographer: { full_name: string; preferred_name: string | null } | null;
};

export function PhotoSection({
  workOrderId,
  photos,
}: {
  workOrderId: string;
  photos: Photo[];
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  async function handleUpload() {
    const files = fileRef.current?.files;
    if (!files?.length) {
      setError("Choose one or more photos first.");
      return;
    }
    setUploading(true);
    setError(null);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is over 10 MB — skipped.`);
        continue;
      }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${workOrderId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("work-orders")
        .upload(path, file, { contentType: file.type });
      if (upErr) {
        setError(`Upload failed: ${upErr.message}`);
        continue;
      }
      const { data } = supabase.storage.from("work-orders").getPublicUrl(path);
      const result = await recordWorkOrderPhoto(
        workOrderId,
        data.publicUrl,
        caption
      );
      if (result.error) setError(result.error);
    }

    setUploading(false);
    setCaption("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <h2 className="text-lg font-extrabold text-[#0e1726] mb-3">
        Photos ({photos.length})
      </h2>

      <div className="bg-white rounded-2xl border border-[#e4e9f1] p-4 shadow-sm mb-4">
        <div className="flex gap-2 flex-wrap items-end">
          <div className="flex-1 min-w-40">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="w-full text-sm text-[#5a6b85] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#fff2e3] file:text-[#b9700f] file:font-semibold file:cursor-pointer"
            />
          </div>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            className="flex-1 min-w-32 border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff8a1e]"
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="bg-[#0e1f38] hover:bg-[#15294a] text-white font-semibold rounded-lg px-4 py-2 text-sm transition disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
        {error && <div className="text-sm text-[#d24b4b] mt-2">{error}</div>}
      </div>

      {!photos.length ? (
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-8 text-center text-[#5a6b85] text-sm">
          No photos yet. Field techs can snap them right from their phone.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setLightbox(p)}
              className="text-left bg-white rounded-xl border border-[#e4e9f1] overflow-hidden shadow-sm hover:border-[#ff8a1e] transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.caption ?? "Work order photo"}
                className="w-full h-28 object-cover"
              />
              <div className="px-2.5 py-1.5">
                {p.caption && (
                  <div className="text-xs font-semibold text-[#0e1726] truncate">
                    {p.caption}
                  </div>
                )}
                <div className="text-[10px] text-[#5a6b85]">
                  {p.photographer
                    ? `${p.photographer.preferred_name || p.photographer.full_name} · `
                    : ""}
                  {new Date(p.created_at).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-3xl w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.caption ?? ""}
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
            <div className="text-white text-sm mt-3 text-center">
              {lightbox.caption && <b>{lightbox.caption} · </b>}
              {lightbox.photographer
                ? `${lightbox.photographer.preferred_name || lightbox.photographer.full_name} · `
                : ""}
              {new Date(lightbox.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
