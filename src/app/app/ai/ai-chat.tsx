"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";

type Msg = { role: "user" | "assistant"; content: string };
type Export = { filename: string; csv: string };

const MAX_UPLOAD_ROWS = 300;

export function AiChat({ suggestions }: { suggestions: string[] }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{ name: string; text: string; rows: number } | null>(null);
  const [downloads, setDownloads] = useState<Record<number, Export[]>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const grid = XLSX.utils.sheet_to_json<unknown[]>(
        wb.Sheets[wb.SheetNames[0]],
        { header: 1, defval: "" }
      );
      const nonEmpty = grid.filter((r) => (r ?? []).some((c) => String(c).trim()));
      if (!nonEmpty.length) throw new Error("empty");
      const clipped = nonEmpty.slice(0, MAX_UPLOAD_ROWS + 1);
      const text = clipped
        .map((r) =>
          (r ?? [])
            .map((c) =>
              c instanceof Date ? c.toISOString().slice(0, 10) : String(c ?? "").trim()
            )
            .join("\t")
        )
        .join("\n");
      setAttachment({
        name: file.name,
        text,
        rows: Math.min(nonEmpty.length - 1, MAX_UPLOAD_ROWS),
      });
      if (nonEmpty.length - 1 > MAX_UPLOAD_ROWS)
        setError(
          `File has ${nonEmpty.length - 1} data rows — only the first ${MAX_UPLOAD_ROWS} are attached. For bigger files use the Import button on the Sites/Equipment pages.`
        );
    } catch {
      setError("Couldn't read that file. Use .csv or .xlsx format.");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function send(text: string) {
    const q = text.trim();
    if ((!q && !attachment) || busy) return;
    setError(null);
    const content = attachment
      ? `${q || "Here is a file to work with."}\n\n[Attached file: ${attachment.name} — tab-separated, first row is headers]\n${attachment.text}`
      : q;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setAttachment(null);
    setBusy(true);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        exports?: Export[];
      };
      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong.");
      } else {
        const idx = next.length;
        setMessages([...next, { role: "assistant", content: data.reply ?? "" }]);
        if (data.exports?.length)
          setDownloads((d) => ({ ...d, [idx]: data.exports! }));
      }
    } catch {
      setError("Connection failed — try again.");
    }
    setBusy(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function download(exp: Export) {
    const blob = new Blob([exp.csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = exp.filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function renderContent(m: Msg) {
    // Hide bulky attached-file bodies in the transcript; show a chip instead.
    const marker = m.content.indexOf("[Attached file:");
    if (m.role === "user" && marker >= 0) {
      const name = m.content.slice(marker + 15, m.content.indexOf("—", marker)).trim();
      return (
        <>
          {m.content.slice(0, marker).trim()}
          <span className="block mt-1 text-xs opacity-80">📎 {name}</span>
        </>
      );
    }
    return m.content;
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e4e9f1] shadow-sm flex flex-col" style={{ minHeight: 480 }}>
      <div className="flex-1 p-5 space-y-4 overflow-y-auto" style={{ maxHeight: 560 }}>
        {!messages.length && (
          <div className="text-center py-8">
            <div className="text-[#5a6b85] text-sm mb-4">Try one of these:</div>
            <div className="flex flex-col items-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-sm bg-[#f5f7fb] hover:bg-[#fff2e3] hover:text-[#b9700f] text-[#0e1726] rounded-full px-4 py-2 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i}>
            <div className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "user"
                    ? "bg-[#0e1f38] text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%] text-sm"
                    : "bg-[#f5f7fb] text-[#0e1726] rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%] text-sm whitespace-pre-wrap"
                }
              >
                {renderContent(m)}
              </div>
            </div>
            {downloads[i]?.map((exp) => (
              <div key={exp.filename} className="flex justify-start mt-2">
                <button
                  onClick={() => download(exp)}
                  className="text-sm font-semibold bg-[#e3f6ec] text-[#1f9d63] hover:bg-[#d2f0e0] rounded-lg px-4 py-2 transition"
                >
                  ⬇ Download {exp.filename}
                </button>
              </div>
            ))}
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-[#f5f7fb] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-[#5a6b85]">
              Checking the data…
            </div>
          </div>
        )}
        {error && (
          <div className="text-sm text-[#d24b4b] bg-[#fbe7e7] rounded-lg px-3 py-2">{error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      {attachment && (
        <div className="mx-3 mb-1 flex items-center gap-2 text-xs bg-[#fff2e3] text-[#b9700f] rounded-lg px-3 py-2">
          📎 {attachment.name} — {attachment.rows} rows attached
          <button
            onClick={() => setAttachment(null)}
            className="ml-auto font-bold hover:text-[#d24b4b]"
          >
            ✕
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-[#e4e9f1] p-3 flex gap-2"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFile}
          className="hidden"
          id="ai-file"
        />
        <label
          htmlFor="ai-file"
          title="Attach a CSV or Excel file to import"
          className="cursor-pointer border border-[#e4e9f1] hover:border-[#ff8a1e] rounded-lg px-3 py-2.5 text-sm text-[#5a6b85]"
        >
          📎
        </label>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask, import a file, or request a CSV export…"
          className="flex-1 border border-[#e4e9f1] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#ff8a1e]"
        />
        <button
          type="submit"
          disabled={busy || (!input.trim() && !attachment)}
          className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2.5 text-sm transition disabled:opacity-60"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
