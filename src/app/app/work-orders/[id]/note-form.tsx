"use client";

import { useState } from "react";
import { addWorkOrderNote } from "../actions";

export function NoteForm({ workOrderId }: { workOrderId: string }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    setError(null);
    const result = await addWorkOrderNote(workOrderId, note);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNote("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a time-stamped note…"
        className="flex-1 border border-[#e4e9f1] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#ff8a1e]"
      />
      <button
        type="submit"
        disabled={saving || !note.trim()}
        className="bg-[#0e1f38] hover:bg-[#15294a] text-white font-semibold rounded-lg px-4 py-2 text-sm transition disabled:opacity-60"
      >
        {saving ? "…" : "Add"}
      </button>
      {error && <span className="text-sm text-[#d24b4b]">{error}</span>}
    </form>
  );
}
