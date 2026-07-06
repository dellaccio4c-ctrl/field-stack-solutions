"use client";

import { useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export function AiChat({ suggestions }: { suggestions: string[] }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setMessages([...next, { role: "assistant", content: data.reply ?? "" }]);
      }
    } catch {
      setError("Connection failed — try again.");
    }
    setBusy(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
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
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "bg-[#0e1f38] text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%] text-sm"
                  : "bg-[#f5f7fb] text-[#0e1726] rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%] text-sm whitespace-pre-wrap"
              }
            >
              {m.content}
            </div>
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-[#e4e9f1] p-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about work orders, sites, equipment, reports…"
          className="flex-1 border border-[#e4e9f1] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#ff8a1e]"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-[#ff8a1e] hover:bg-[#ffa347] text-white font-semibold rounded-lg px-5 py-2.5 text-sm transition disabled:opacity-60"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
